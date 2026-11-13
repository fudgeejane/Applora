import { Buffer } from "node:buffer";
import mongoose from "mongoose";
import multer from "multer";
import process from "node:process";
import Resume from "../models/Resume.js";
import {
  deleteResumeFile,
  createResumeDownloadUrl,
  isCloudinaryConfigured,
  uploadResumeFile,
} from "../services/cloudinaryStorage.js";
import { GeminiServiceError, geminiService } from "../services/geminiService.js";
import {
  extractResumeText,
  ResumeTextExtractionError,
  resumeTextMimeTypes,
} from "../services/resumeTextService.js";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_TARGET_ROLE_LENGTH = 120;
const CLOUDINARY_HOSTS = new Set(["api.cloudinary.com", "res.cloudinary.com"]);
const allowedResumeMimeTypes = new Map([
  [".pdf", new Set([resumeTextMimeTypes.pdf, "application/octet-stream"])],
  [".docx", new Set([resumeTextMimeTypes.docx, "application/octet-stream"])],
  [".txt", new Set([resumeTextMimeTypes.txt, "application/octet-stream"])],
]);
const multipartUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1, fields: 2, fieldSize: 1024 },
});

export function parseResumeUpload(req, res, next) {
  multipartUpload.single("resume")(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      const tooLarge = error.code === "LIMIT_FILE_SIZE";
      return res.status(tooLarge ? 413 : 400).json({
        message: tooLarge
          ? "Resume files must be 8 MB or smaller."
          : "The resume upload request is invalid.",
      });
    }
    if (/boundary|unexpected end of (?:form|file)/i.test(error?.message || "")) {
      return res.status(400).json({ message: "The resume upload data is incomplete or malformed." });
    }
    return next(error);
  });
}

export function getResumeFormat(fileName) {
  const extension = typeof fileName === "string"
    ? `.${fileName.toLowerCase().split(".").pop()}`
    : "";
  const mimeType = {
    ".pdf": resumeTextMimeTypes.pdf,
    ".docx": resumeTextMimeTypes.docx,
    ".txt": resumeTextMimeTypes.txt,
  }[extension];
  if (!mimeType) return null;
  return {
    extension: extension.slice(1),
    mimeType,
    resourceType: extension === ".pdf" ? "image" : "raw",
  };
}

function hasExpectedFileSignature(buffer, extension) {
  if (extension === ".pdf") return buffer.subarray(0, 5).toString() === "%PDF-";
  if (extension === ".docx") return buffer.subarray(0, 4).toString() === "PK\u0003\u0004";
  if (extension === ".txt") {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      return !buffer.includes(0);
    } catch {
      return false;
    }
  }
  return false;
}

export function isValidResumeFile(file) {
  const fileName = typeof file?.originalname === "string"
    ? file.originalname.split(/[\\/]/).pop().trim()
    : "";
  const extension = `.${fileName.toLowerCase().split(".").pop()}`;
  const supportedMimeTypes = allowedResumeMimeTypes.get(extension);
  return Boolean(
    file
    && supportedMimeTypes
    && Buffer.isBuffer(file.buffer)
    && file.size === file.buffer.length
    && file.size > 0
    && file.size <= MAX_FILE_BYTES
    && fileName
    && fileName.length <= 255
    && supportedMimeTypes.has(file.mimetype)
    && hasExpectedFileSignature(file.buffer, extension)
  );
}

export function isValidPdfFile(file) {
  return getResumeFormat(file?.originalname)?.extension === "pdf" && isValidResumeFile(file);
}

function isValidResumeBuffer(buffer, fileName, fileType) {
  const format = getResumeFormat(fileName);
  const allowedTypes = format && allowedResumeMimeTypes.get(`.${format.extension}`);
  return Boolean(
    format
    && Buffer.isBuffer(buffer)
    && buffer.length > 0
    && buffer.length <= MAX_FILE_BYTES
    && allowedTypes.has(fileType || format.mimeType)
    && hasExpectedFileSignature(buffer, `.${format.extension}`)
  );
}

function publicResume(resume) {
  const fileType = resume.fileType || resume.contentType || "application/pdf";
  const fileSize = resume.fileSize ?? resume.fileData?.length;
  return {
    id: String(resume._id),
    name: resume.name || resume.fileName,
    title: resume.name || resume.fileName,
    occupation: resume.occupation,
    fileName: resume.fileName,
    fileType,
    contentType: fileType,
    fileSize,
    size: fileSize,
    resumeUrl: resume.resumeUrl || null,
    uploadedAt: resume.uploadedAt || resume.createdAt,
    createdAt: resume.createdAt,
    updatedAt: resume.updatedAt,
    activity: resume.activity || [],
  };
}

function createActivity(type, message) {
  return {
    id: new mongoose.Types.ObjectId().toString(),
    type,
    message,
    createdAt: new Date().toISOString(),
  };
}

function safeDownloadName(fileName) {
  return fileName.replace(/[\r\n"\\]/g, "_");
}

export function isAllowedResumeStorageUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "https:"
      && CLOUDINARY_HOSTS.has(parsedUrl.hostname)
      && !parsedUrl.username
      && !parsedUrl.password;
  } catch {
    return false;
  }
}

function cloudinaryFailure(error) {
  const status = Number(error?.http_code || error?.statusCode);
  if (status === 401) {
    return {
      logMessage: "Cloudinary rejected the configured API credentials.",
      responseMessage: "Cloudinary rejected its configured credentials. Verify CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in server/.env, then restart the backend.",
    };
  }

  let logMessage = String(error?.message || "Unknown Cloudinary error");
  for (const secret of [
    process.env.CLOUDINARY_API_SECRET,
    process.env.CLOUDINARY_API_KEY,
  ]) {
    if (secret) logMessage = logMessage.split(secret).join("[redacted]");
  }
  logMessage = logMessage.replace(/Invalid Signature [a-f0-9]+/ig, "Invalid Signature [redacted]");
  return {
    logMessage: logMessage.slice(0, 500),
    responseMessage: "Resume file storage failed. Check the backend log for the Cloudinary error.",
  };
}

function sendResumeFile(res, fileName, contentType, fileData) {
  res.set({
    "Content-Type": contentType,
    "Content-Length": fileData.length,
    "Content-Disposition": `attachment; filename="${safeDownloadName(fileName)}"`,
    "X-Content-Type-Options": "nosniff",
  });
  return res.send(fileData);
}

async function readStoredFile(response) {
  const reader = response.body?.getReader();
  if (!reader) return null;

  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_FILE_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, size);
}

class ResumeFileError extends Error {
  constructor(statusCode, publicMessage, options = {}) {
    super(publicMessage, options.cause ? { cause: options.cause } : undefined);
    this.name = "ResumeFileError";
    this.statusCode = statusCode;
    this.publicMessage = publicMessage;
    this.diagnosticCode = options.diagnosticCode || "resume-file-error";
  }
}

async function loadResumeFile(resume) {
  if (resume.resumeUrl) {
    let response;
    try {
      if (resume.cloudinaryPublicId && !isCloudinaryConfigured()) {
        throw new ResumeFileError(503, "Resume storage is unavailable. Please try again later.", {
          diagnosticCode: "storage-not-configured",
        });
      }
      const format = getResumeFormat(resume.fileName);
      const resourceType = resume.storageResourceType || "image";
      const downloadUrl = resume.cloudinaryPublicId
        ? createResumeDownloadUrl(resume.cloudinaryPublicId, format?.extension || "pdf", resourceType)
        : resume.resumeUrl;
      if (!isAllowedResumeStorageUrl(downloadUrl)) {
        throw new ResumeFileError(502, "The stored resume file is invalid.", { diagnosticCode: "stored-url-invalid" });
      }
      response = await fetch(downloadUrl, {
        signal: AbortSignal.timeout(15000),
        redirect: "error",
      });
    } catch (error) {
      if (error instanceof ResumeFileError) throw error;
      throw new ResumeFileError(502, "The resume file is temporarily unavailable.", {
        cause: error,
        diagnosticCode: "storage-fetch-failed",
      });
    }

    if (!response.ok) {
      throw new ResumeFileError(502, "The resume file is temporarily unavailable.", { diagnosticCode: "storage-response-failed" });
    }
    let fileData;
    try {
      fileData = await readStoredFile(response);
    } catch (error) {
      throw new ResumeFileError(502, "The resume file is temporarily unavailable.", {
        cause: error,
        diagnosticCode: "storage-read-failed",
      });
    }
    if (!isValidResumeBuffer(fileData, resume.fileName, resume.fileType)) {
      throw new ResumeFileError(502, "The stored resume file is invalid.", { diagnosticCode: "stored-file-invalid" });
    }
    return fileData;
  }

  if (!resume.fileData?.length) return null;
  const fileData = Buffer.from(resume.fileData);
  if (
    !isValidResumeBuffer(fileData, resume.fileName, resume.fileType)
  ) {
    throw new ResumeFileError(502, "The stored resume file is invalid.", { diagnosticCode: "stored-file-invalid" });
  }
  return fileData;
}

export async function listResumes(req, res, next) {
  try {
    const resumes = await Resume.find({ userId: req.user.id }).sort({ createdAt: -1 });
    return res.json({ resumes: resumes.map(publicResume) });
  } catch (error) {
    return next(error);
  }
}

export async function analyzeResume(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: "Resume not found." });
  }
  if (req.body?.consent !== true) {
    return res.status(400).json({ message: "Confirm that you want to send this resume to Google Gemini for analysis." });
  }
  const { targetRole } = req.body || {};
  if (targetRole !== undefined && typeof targetRole !== "string") {
    return res.status(400).json({ message: "Target role must be text." });
  }
  if (typeof targetRole === "string" && targetRole.trim().length > MAX_TARGET_ROLE_LENGTH) {
    return res.status(400).json({ message: `Target role must be ${MAX_TARGET_ROLE_LENGTH} characters or fewer.` });
  }

  try {
    const resume = await Resume.findOne({ _id: req.params.id, userId: req.user.id }).select("+fileData");
    if (!resume) return res.status(404).json({ message: "Resume not found." });

    geminiService.assertResumeAnalysisConfigured();
    const fileBuffer = await loadResumeFile(resume);
    if (!fileBuffer) return res.status(404).json({ message: "Resume file not found." });
    const resumeText = await extractResumeText(fileBuffer, resume.fileName);

    const analysis = await geminiService.analyzeResume({
      resumeText,
      targetRole: targetRole?.trim() || resume.occupation || "",
    });
    return res.json({ analysis });
  } catch (error) {
    if (
      error instanceof ResumeFileError
      || error instanceof ResumeTextExtractionError
      || error instanceof GeminiServiceError
    ) {
      console.error("Resume analysis request failed:", error.name, error.statusCode, error.diagnosticCode);
      return res.status(error.statusCode).json({
        message: error.publicMessage,
        code: error.diagnosticCode,
      });
    }
    return next(error);
  }
}

export async function getResume(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Resume not found." });
    }
    const resume = await Resume.findOne({ _id: req.params.id, userId: req.user.id });
    if (!resume) return res.status(404).json({ message: "Resume not found." });
    return res.json({ resume: publicResume(resume) });
  } catch (error) {
    return next(error);
  }
}

export async function uploadResume(req, res, next) {
  const file = req.file;
  const { name, occupation } = req.body || {};
  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ message: "Enter a name for this resume." });
  }
  if (name.trim().length > 255) {
    return res.status(400).json({ message: "Resume name must be 255 characters or fewer." });
  }
  if (occupation !== undefined && typeof occupation !== "string") {
    return res.status(400).json({ message: "Resume occupation must be text." });
  }
  if (!file) {
    return res.status(400).json({ message: "A PDF, DOCX, or TXT resume file is required." });
  }
  const fileName = typeof file.originalname === "string"
    ? file.originalname.split(/[\\/]/).pop().trim()
    : "";
  const fileFormat = getResumeFormat(fileName);
  if (!isValidResumeFile(file)) {
    return res.status(400).json({ message: "Choose a valid PDF, DOCX, or UTF-8 TXT resume." });
  }
  const resumeName = name.trim();
  const resumeOccupation = occupation?.trim() || "";
  if (resumeOccupation.length > 120) {
    return res.status(400).json({ message: "Resume occupation must be 120 characters or fewer." });
  }
  if (!isCloudinaryConfigured()) {
    return res.status(503).json({ message: "Resume storage is not configured. Please try again later." });
  }

  let cloudinaryAsset;
  try {
    cloudinaryAsset = await uploadResumeFile(file.buffer, {
      resourceType: fileFormat.resourceType,
      format: fileFormat.extension,
    });
  } catch (error) {
    const failure = cloudinaryFailure(error);
    console.error(
      "Cloudinary resume upload failed:",
      error?.name || "Error",
      error?.http_code || error?.statusCode || "unknown status",
      error?.code || "unknown code",
      failure.logMessage,
    );
    return res.status(502).json({
      message: failure.responseMessage,
    });
  }

  let resume;
  try {
    resume = await Resume.create({
      userId: req.user.id,
      name: resumeName,
      occupation: resumeOccupation,
      fileName,
      cloudinaryPublicId: cloudinaryAsset.publicId,
      resumeUrl: cloudinaryAsset.secureUrl,
      storageResourceType: fileFormat.resourceType,
      fileType: fileFormat.mimeType,
      fileSize: file.size,
      uploadedAt: new Date(),
      activity: [createActivity("resume_uploaded", "Resume uploaded")],
    });
  } catch (error) {
    try {
      await deleteResumeFile(cloudinaryAsset.publicId, fileFormat.resourceType);
    } catch (cleanupError) {
      console.error("Cloudinary resume cleanup failed:", cleanupError?.name || "Error", cleanupError?.http_code || cleanupError?.statusCode, cleanupError?.code);
    }
    return next(error);
  }
  return res.status(201).json({ resume: publicResume(resume) });
}

export async function updateResume(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Resume not found." });
    }

    const body = req.body || {};
    const updates = {};
    if (Object.hasOwn(body, "name")) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return res.status(400).json({ message: "Enter a name for this resume." });
      }
      if (body.name.trim().length > 255) {
        return res.status(400).json({ message: "Resume name must be 255 characters or fewer." });
      }
      updates.name = body.name.trim();
    }
    if (Object.hasOwn(body, "occupation")) {
      if (typeof body.occupation !== "string") {
        return res.status(400).json({ message: "Resume occupation must be text." });
      }
      if (body.occupation.trim().length > 120) {
        return res.status(400).json({ message: "Resume occupation must be 120 characters or fewer." });
      }
      updates.occupation = body.occupation.trim();
    }
    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: "Update the resume name or occupation." });
    }

    const resume = await Resume.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: updates, $push: { activity: createActivity("resume_updated", "Resume details updated") } },
      { returnDocument: "after", runValidators: true },
    );
    if (!resume) return res.status(404).json({ message: "Resume not found." });
    return res.json({ resume: publicResume(resume) });
  } catch (error) {
    return next(error);
  }
}

export async function downloadResume(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Resume not found." });
    }
    const resume = await Resume.findOne({ _id: req.params.id, userId: req.user.id }).select("+fileData");
    if (!resume) return res.status(404).json({ message: "Resume not found." });

    if (resume.resumeUrl) {
      let storedFile;
      try {
        if (resume.cloudinaryPublicId && !isCloudinaryConfigured()) {
          return res.status(503).json({ message: "Resume storage is unavailable. Please try again later." });
        }
        const format = getResumeFormat(resume.fileName);
        const resourceType = resume.storageResourceType || "image";
        const downloadUrl = resume.cloudinaryPublicId
          ? createResumeDownloadUrl(resume.cloudinaryPublicId, format?.extension || "pdf", resourceType)
          : resume.resumeUrl;
        storedFile = await fetch(downloadUrl, { signal: AbortSignal.timeout(15000) });
      } catch {
        return res.status(502).json({ message: "The resume file is temporarily unavailable." });
      }
      if (!storedFile.ok) {
        return res.status(502).json({ message: "The resume file is temporarily unavailable." });
      }
      let fileData;
      try {
        fileData = await readStoredFile(storedFile);
      } catch {
        return res.status(502).json({ message: "The resume file is temporarily unavailable." });
      }
      if (!isValidResumeBuffer(fileData, resume.fileName, resume.fileType)) {
        return res.status(502).json({ message: "The stored resume file is invalid." });
      }
      return sendResumeFile(res, resume.fileName, resume.fileType || format?.mimeType || "application/pdf", fileData);
    }

    if (!resume.fileData?.length) {
      return res.status(404).json({ message: "Resume file not found." });
    }
    const legacyType = resume.contentType || resume.fileType;
    const format = getResumeFormat(resume.fileName);
    const contentType = format?.mimeType || (allowedResumeMimeTypes.get(".pdf").has(legacyType) ? legacyType : "application/pdf");
    if (!isValidResumeBuffer(resume.fileData, resume.fileName, contentType)) {
      return res.status(502).json({ message: "The stored resume file is invalid." });
    }
    return sendResumeFile(res, resume.fileName, contentType, resume.fileData);
  } catch (error) {
    return next(error);
  }
}

export async function deleteResume(req, res, next) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: "Resume not found." });
    }
    const resume = await Resume.findOne({ _id: req.params.id, userId: req.user.id });
    if (!resume) return res.status(404).json({ message: "Resume not found." });

    if (resume.cloudinaryPublicId) {
      if (!isCloudinaryConfigured()) {
        return res.status(503).json({ message: "Resume storage is unavailable. Please try again later." });
      }
      const result = await deleteResumeFile(resume.cloudinaryPublicId, resume.storageResourceType || "image");
      if (!["ok", "not found"].includes(result?.result)) {
        return res.status(502).json({ message: "The resume file could not be deleted from storage." });
      }
    }

    await Resume.deleteOne({ _id: resume._id, userId: req.user.id });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
}
