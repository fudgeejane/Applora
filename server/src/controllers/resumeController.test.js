import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import process from "node:process";
import { v2 as cloudinary } from "cloudinary";
import express from "express";
import {
  analyzeResume,
  getResumeFormat,
  isAllowedResumeStorageUrl,
  isValidResumeFile,
  parseResumeUpload,
  isValidPdfFile,
  updateResume,
  uploadResume,
} from "./resumeController.js";
import Resume from "../models/Resume.js";
import { GeminiServiceError, geminiService } from "../services/geminiService.js";

function pdfFile({
  originalname = "resume.pdf",
  mimetype = "application/pdf",
  buffer = Buffer.from("%PDF-1.7\nresume"),
} = {}) {
  return { originalname, mimetype, buffer, size: buffer.length };
}

function textPdf(text) {
  const escapedText = text.replace(/([\\()])/g, "\\$1");
  const stream = `BT /F1 12 Tf 72 720 Td (${escapedText}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let document = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(document));
    document += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(document);
  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  document += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  document += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(document);
}

test("resume upload validation accepts a PDF within the size limit", () => {
  assert.equal(isValidPdfFile(pdfFile()), true);
  assert.equal(isValidPdfFile(pdfFile({ mimetype: "application/octet-stream" })), true);
});

test("resume upload validation supports PDF, DOCX, and UTF-8 TXT formats", () => {
  const docxBuffer = Buffer.from("PK\u0003\u0004docx content");
  const txtBuffer = Buffer.from("Product designer", "utf8");
  assert.equal(getResumeFormat("resume.docx").resourceType, "raw");
  assert.equal(isValidResumeFile({
    originalname: "resume.docx",
    mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: docxBuffer,
    size: docxBuffer.length,
  }), true);
  assert.equal(isValidResumeFile({
    originalname: "resume.txt",
    mimetype: "text/plain",
    buffer: txtBuffer,
    size: txtBuffer.length,
  }), true);
  assert.equal(isValidResumeFile({
    originalname: "resume.exe",
    mimetype: "application/octet-stream",
    buffer: txtBuffer,
    size: txtBuffer.length,
  }), false);
});

test("resume storage URLs allow only HTTPS Cloudinary asset and signed-download hosts", () => {
  assert.equal(isAllowedResumeStorageUrl("https://res.cloudinary.com/example/image/upload/resume.pdf"), true);
  assert.equal(isAllowedResumeStorageUrl("https://api.cloudinary.com/v1_1/example/image/download?signature=temporary"), true);
  assert.equal(isAllowedResumeStorageUrl("http://res.cloudinary.com/example/resume.pdf"), false);
  assert.equal(isAllowedResumeStorageUrl("https://cloudinary.com.example.invalid/resume.pdf"), false);
  assert.equal(isAllowedResumeStorageUrl("https://user:pass@api.cloudinary.com/resume.pdf"), false);
});

test("resume upload validation rejects non-PDF filenames, MIME types, and contents", () => {
  assert.equal(isValidPdfFile(pdfFile({ originalname: "resume.docx" })), false);
  assert.equal(isValidPdfFile(pdfFile({ mimetype: "application/msword" })), false);
  assert.equal(isValidPdfFile(pdfFile({ buffer: Buffer.from("not a PDF") })), false);
});

test("resume upload validation enforces the 8 MB limit and consistent file size", () => {
  const oversizedBuffer = Buffer.alloc(8 * 1024 * 1024 + 1);
  oversizedBuffer.write("%PDF-");
  assert.equal(isValidPdfFile(pdfFile({ buffer: oversizedBuffer })), false);
  assert.equal(isValidPdfFile({ ...pdfFile(), size: 1 }), false);
});

test("resume analysis requires explicit consent before loading a file", async () => {
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await analyzeResume({
    params: { id: "64b000000000000000000002" },
    body: {},
    user: { id: "64b000000000000000000001" },
  }, res, (error) => { throw error; });

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /confirm/i);
});

test("resume analysis lookup is scoped to the authenticated owner", async () => {
  const originalFindOne = Resume.findOne;
  let filter;
  Resume.findOne = (query) => {
    filter = query;
    return { select: async () => null };
  };
  try {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await analyzeResume({
      params: { id: "64b000000000000000000002" },
      body: { consent: true },
      user: { id: "64b000000000000000000001" },
    }, res, (error) => { throw error; });

    assert.deepEqual(filter, {
      _id: "64b000000000000000000002",
      userId: "64b000000000000000000001",
    });
    assert.equal(res.statusCode, 404);
  } finally {
    Resume.findOne = originalFindOne;
  }
});

test("resume analysis sends the owner's stored PDF to Gemini and returns structured feedback", async () => {
  const originalFindOne = Resume.findOne;
  const originalAssertConfigured = geminiService.assertResumeAnalysisConfigured;
  const originalAnalyze = geminiService.analyzeResume;
  const pdfBuffer = textPdf("Jordan Lee Product Designer Figma");
  let filter;
  let submittedText;
  let submittedTargetRole;
  Resume.findOne = (query) => {
    filter = query;
    return {
      select: async () => ({
        fileData: pdfBuffer,
        fileName: "designer_resume.pdf",
        fileType: "application/pdf",
        occupation: "Designer",
      }),
    };
  };
  geminiService.assertResumeAnalysisConfigured = () => {};
  geminiService.analyzeResume = async ({ resumeText, targetRole }) => {
    submittedText = resumeText;
    submittedTargetRole = targetRole;
    return {
      occupation: { primary: "Product Designer", alternatives: [] },
      atsCompatibility: { score: 80, explanation: "Clear sections.", improvements: [] },
      professionalSummary: { assessment: "Clear.", improved: "Product designer." },
      workExperience: { assessment: "Clear.", rewrittenExamples: [] },
      skills: { assessment: "Relevant.", technical: [], soft: [], recommendedKeywords: [] },
      educationAssessment: "Clear.",
      formattingAssessment: "Readable.",
      grammarIssues: [],
      strengths: [],
      areasForImprovement: [],
      recommendations: [],
      optimizedResume: "Product designer.",
      limitations: [],
    };
  };

  try {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await analyzeResume({
      params: { id: "64b000000000000000000002" },
      body: { consent: true, targetRole: "Product Designer" },
      user: { id: "64b000000000000000000001" },
    }, res, (error) => { throw error; });

    assert.deepEqual(filter, {
      _id: "64b000000000000000000002",
      userId: "64b000000000000000000001",
    });
    assert.match(submittedText, /Jordan Lee Product Designer Figma/);
    assert.equal(submittedTargetRole, "Product Designer");
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.analysis.occupation.primary, "Product Designer");
  } finally {
    Resume.findOne = originalFindOne;
    geminiService.assertResumeAnalysisConfigured = originalAssertConfigured;
    geminiService.analyzeResume = originalAnalyze;
  }
});

test("resume analysis errors return a safe diagnostic code", async () => {
  const originalFindOne = Resume.findOne;
  const originalAssertConfigured = geminiService.assertResumeAnalysisConfigured;
  const originalAnalyze = geminiService.analyzeResume;
  Resume.findOne = () => ({
    select: async () => ({
      fileData: textPdf("Jordan Lee Product Designer"),
      fileName: "designer_resume.pdf",
      fileType: "application/pdf",
      occupation: "",
    }),
  });
  geminiService.assertResumeAnalysisConfigured = () => {};
  geminiService.analyzeResume = async () => {
    throw new GeminiServiceError(502, "The AI service could not complete the request.", {
      diagnosticCode: "provider-400",
    });
  };

  try {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await analyzeResume({
      params: { id: "64b000000000000000000002" },
      body: { consent: true },
      user: { id: "64b000000000000000000001" },
    }, res, (error) => { throw error; });

    assert.equal(res.statusCode, 502);
    assert.deepEqual(res.body, {
      message: "The AI service could not complete the request.",
      code: "provider-400",
    });
  } finally {
    Resume.findOne = originalFindOne;
    geminiService.assertResumeAnalysisConfigured = originalAssertConfigured;
    geminiService.analyzeResume = originalAnalyze;
  }
});

test("resume upload requires a custom name before storing the file", async () => {
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await uploadResume({
    file: pdfFile(),
    body: { occupation: "Engineer" },
    user: { id: "64b000000000000000000001" },
  }, res, (error) => { throw error; });

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /name/i);
});

test("malformed multipart requests return 400 instead of an internal server error", async (t) => {
  const app = express();
  app.post("/upload", parseResumeUpload, (req, res) => res.status(204).end());
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));

  const response = await fetch(`http://127.0.0.1:${server.address().port}/upload`, {
    method: "POST",
    headers: { "Content-Type": "multipart/form-data" },
    body: "invalid multipart body",
  });
  assert.equal(response.status, 400);
});

test("valid multipart PDF uploads are parsed with their fields and file", async (t) => {
  const app = express();
  app.post("/upload", parseResumeUpload, (req, res) => res.json({
    fields: req.body,
    file: {
      name: req.file?.originalname,
      type: req.file?.mimetype,
      valid: isValidPdfFile(req.file),
    },
  }));
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));

  const formData = new FormData();
  formData.append("name", "Product Designer — SaaS");
  formData.append("occupation", "Engineer");
  formData.append("resume", new Blob([Buffer.from("%PDF-1.7\nresume")], {
    type: "application/pdf",
  }), "resume.pdf");

  const response = await fetch(`http://127.0.0.1:${server.address().port}/upload`, {
    method: "POST",
    body: formData,
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    fields: { name: "Product Designer — SaaS", occupation: "Engineer" },
    file: { name: "resume.pdf", type: "application/pdf", valid: true },
  });
});

test("resume detail updates trim and persist the custom name and occupation", async () => {
  const originalFindOneAndUpdate = Resume.findOneAndUpdate;
  let update;
  Resume.findOneAndUpdate = async (_filter, updateDocument) => {
    update = updateDocument;
    return {
      _id: "64b000000000000000000002",
      name: updateDocument.$set.name,
      occupation: updateDocument.$set.occupation,
      fileName: "designer_resume.pdf",
      fileType: "application/pdf",
      fileSize: 64,
      activity: updateDocument.$push.activity ? [updateDocument.$push.activity] : [],
      toObject() {
        return { ...this, _id: this._id };
      },
    };
  };
  try {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await updateResume({
      params: { id: "64b000000000000000000002" },
      body: { name: "  Product Designer  ", occupation: "  Designer  " },
      user: { id: "64b000000000000000000001" },
    }, res, (error) => { throw error; });

    assert.equal(update.$set.name, "Product Designer");
    assert.equal(update.$set.occupation, "Designer");
    assert.equal(res.body.resume.name, "Product Designer");
    assert.equal(res.body.resume.fileName, "designer_resume.pdf");
    assert.equal(res.body.resume.activity[0].type, "resume_updated");
  } finally {
    Resume.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("resume detail updates reject blank names without writing", async () => {
  const originalFindOneAndUpdate = Resume.findOneAndUpdate;
  let called = false;
  Resume.findOneAndUpdate = async () => { called = true; };
  try {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await updateResume({
      params: { id: "64b000000000000000000002" },
      body: { name: "   " },
      user: { id: "64b000000000000000000001" },
    }, res, (error) => { throw error; });

    assert.equal(res.statusCode, 400);
    assert.equal(called, false);
  } finally {
    Resume.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("resume upload stores the custom name separately from the original filename", async () => {
  const keys = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
  const previousEnvironment = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const originalUploadStream = cloudinary.uploader.upload_stream;
  const originalCreate = Resume.create;
  let createdRecord;
  process.env.CLOUDINARY_CLOUD_NAME = "resume-test-cloud";
  process.env.CLOUDINARY_API_KEY = "resume-test-key";
  process.env.CLOUDINARY_API_SECRET = "resume-test-secret";
  cloudinary.uploader.upload_stream = (options, callback) => ({
    end(buffer) {
      assert.equal(buffer.subarray(0, 5).toString(), "%PDF-");
      callback(null, {
        secure_url: "https://res.cloudinary.com/resume-test-cloud/image/upload/resumes/test.pdf",
        public_id: `resumes/${options.public_id}`,
      });
    },
  });
  Resume.create = async (record) => {
    createdRecord = record;
    return {
      ...record,
      _id: "64b000000000000000000002",
      createdAt: new Date("2026-11-11T00:00:00.000Z"),
      updatedAt: new Date("2026-11-11T00:00:00.000Z"),
    };
  };

  try {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await uploadResume({
      file: pdfFile({ originalname: "designer_cv_v4.pdf" }),
      body: { name: "Product Designer — SaaS", occupation: "Product Designer" },
      user: { id: "64b000000000000000000001" },
    }, res, (error) => { throw error; });

    assert.equal(res.statusCode, 201);
    assert.equal(createdRecord.name, "Product Designer — SaaS");
    assert.equal(createdRecord.occupation, "Product Designer");
    assert.equal(createdRecord.fileName, "designer_cv_v4.pdf");
    assert.equal(res.body.resume.name, "Product Designer — SaaS");
    assert.equal(res.body.resume.fileName, "designer_cv_v4.pdf");
  } finally {
    cloudinary.uploader.upload_stream = originalUploadStream;
    Resume.create = originalCreate;
    for (const key of keys) {
      if (previousEnvironment[key] === undefined) delete process.env[key];
      else process.env[key] = previousEnvironment[key];
    }
  }
});

test("DOCX uploads use Cloudinary raw storage and preserve resume format metadata", async () => {
  const keys = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
  const previousEnvironment = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const originalUploadStream = cloudinary.uploader.upload_stream;
  const originalCreate = Resume.create;
  const buffer = Buffer.from("PK\u0003\u0004docx content");
  let createdRecord;
  process.env.CLOUDINARY_CLOUD_NAME = "resume-test-cloud";
  process.env.CLOUDINARY_API_KEY = "resume-test-key";
  process.env.CLOUDINARY_API_SECRET = "resume-test-secret";
  cloudinary.uploader.upload_stream = (options, callback) => ({
    end(uploadedBuffer) {
      assert.deepEqual(uploadedBuffer, buffer);
      assert.equal(options.resource_type, "raw");
      assert.match(options.public_id, /\.docx$/);
      callback(null, {
        secure_url: "https://res.cloudinary.com/resume-test-cloud/raw/upload/resumes/test.docx",
        public_id: "resumes/test.docx",
      });
    },
  });
  Resume.create = async (record) => {
    createdRecord = record;
    return { ...record, _id: "64b000000000000000000002" };
  };

  try {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    await uploadResume({
      file: {
        originalname: "designer_resume.docx",
        mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        buffer,
        size: buffer.length,
      },
      body: { name: "Product Designer", occupation: "Designer" },
      user: { id: "64b000000000000000000001" },
    }, res, (error) => { throw error; });

    assert.equal(res.statusCode, 201);
    assert.equal(createdRecord.storageResourceType, "raw");
    assert.equal(createdRecord.fileType, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    assert.equal(res.body.resume.fileName, "designer_resume.docx");
  } finally {
    cloudinary.uploader.upload_stream = originalUploadStream;
    Resume.create = originalCreate;
    for (const key of keys) {
      if (previousEnvironment[key] === undefined) delete process.env[key];
      else process.env[key] = previousEnvironment[key];
    }
  }
});
