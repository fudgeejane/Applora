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

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const allowedPdfTypes = new Set(["application/pdf", "application/octet-stream"]);
const allowedDownloadTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream",
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

export function isValidPdfFile(file) {
  const fileName = typeof file?.originalname === "string"
    ? file.originalname.split(/[\\/]/).pop().trim()
    : "";
  return Boolean(
    file
    && Buffer.isBuffer(file.buffer)
    && file.size === file.buffer.length
    && file.size > 0
    && file.size <= MAX_FILE_BYTES
    && fileName
    && fileName.length <= 255
    && fileName.toLowerCase().endsWith(".pdf")
    && allowedPdfTypes.has(file.mimetype)
    && file.buffer.subarray(0, 5).toString() === "%PDF-"
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

async function readStoredPdf(response) {
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

export async function listResumes(req, res, next) {
  try {
    const resumes = await Resume.find({ userId: req.user.id }).sort({ createdAt: -1 });
    return res.json({ resumes: resumes.map(publicResume) });
  } catch (error) {
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
    return res.status(400).json({ message: "A PDF resume file is required." });
  }
  const fileName = typeof file.originalname === "string"
    ? file.originalname.split(/[\\/]/).pop().trim()
    : "";
  if (!isValidPdfFile(file)) {
    return res.status(400).json({ message: "Choose a valid PDF resume." });
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
    cloudinaryAsset = await uploadResumeFile(file.buffer);
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
      fileType: "application/pdf",
      fileSize: file.size,
      uploadedAt: new Date(),
      activity: [createActivity("resume_uploaded", "Resume uploaded")],
    });
  } catch (error) {
    try {
      await deleteResumeFile(cloudinaryAsset.publicId);
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
        const downloadUrl = resume.cloudinaryPublicId
          ? createResumeDownloadUrl(resume.cloudinaryPublicId)
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
        fileData = await readStoredPdf(storedFile);
      } catch {
        return res.status(502).json({ message: "The resume file is temporarily unavailable." });
      }
      if (
        !fileData?.length
        || fileData.subarray(0, 5).toString() !== "%PDF-"
      ) {
        return res.status(502).json({ message: "The stored resume file is invalid." });
      }
      return sendResumeFile(res, resume.fileName, "application/pdf", fileData);
    }

    if (!resume.fileData?.length) {
      return res.status(404).json({ message: "Resume file not found." });
    }
    const legacyType = resume.contentType || resume.fileType;
    const contentType = allowedDownloadTypes.has(legacyType) ? legacyType : "application/pdf";
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
      const result = await deleteResumeFile(resume.cloudinaryPublicId);
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
