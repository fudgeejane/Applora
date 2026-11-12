import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import process from "node:process";
import { v2 as cloudinary } from "cloudinary";
import express from "express";
import { parseResumeUpload, isValidPdfFile, updateResume, uploadResume } from "./resumeController.js";
import Resume from "../models/Resume.js";

function pdfFile({
  originalname = "resume.pdf",
  mimetype = "application/pdf",
  buffer = Buffer.from("%PDF-1.7\nresume"),
} = {}) {
  return { originalname, mimetype, buffer, size: buffer.length };
}

test("resume upload validation accepts a PDF within the size limit", () => {
  assert.equal(isValidPdfFile(pdfFile()), true);
  assert.equal(isValidPdfFile(pdfFile({ mimetype: "application/octet-stream" })), true);
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
