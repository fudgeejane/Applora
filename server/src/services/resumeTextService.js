import { Buffer } from "node:buffer";
import mammoth from "mammoth";

const MAX_RESUME_TEXT_LENGTH = 40_000;
const MAX_PDF_PAGES = 100;
const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export class ResumeTextExtractionError extends Error {
  constructor(statusCode, publicMessage, diagnosticCode) {
    super(publicMessage);
    this.name = "ResumeTextExtractionError";
    this.statusCode = statusCode;
    this.publicMessage = publicMessage;
    this.diagnosticCode = diagnosticCode;
  }
}

function normalizeText(text) {
  return text
    .split(String.fromCharCode(0)).join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function validateExtractedText(text) {
  const normalized = normalizeText(text);
  if (!normalized) {
    throw new ResumeTextExtractionError(
      400,
      "No readable text was found. Upload a text-based PDF, DOCX, or TXT resume.",
      "resume-text-empty",
    );
  }
  if (normalized.length > MAX_RESUME_TEXT_LENGTH) {
    throw new ResumeTextExtractionError(
      413,
      "This resume contains too much text to analyze. Shorten it and try again.",
      "resume-text-too-large",
    );
  }
  return normalized;
}

async function extractPdfText(buffer) {
  if (buffer.subarray(0, 5).toString() !== "%PDF-") {
    throw new ResumeTextExtractionError(400, "The PDF file is invalid. Upload a readable resume file.", "invalid-pdf");
  }

  let document;
  let loadingTask;
  try {
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    loadingTask = getDocument({
      data: new Uint8Array(buffer),
      isEvalSupported: false,
      useWorkerFetch: false,
    });
    document = await loadingTask.promise;
    if (document.numPages > MAX_PDF_PAGES) {
      throw new ResumeTextExtractionError(
        413,
        "This PDF has too many pages to analyze. Upload a shorter resume.",
        "resume-pdf-too-many-pages",
      );
    }

    const pages = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items
        .map((item) => (typeof item.str === "string" ? item.str : ""))
        .filter(Boolean)
        .join(" "));
    }
    return validateExtractedText(pages.join("\n\n"));
  } catch (error) {
    if (error instanceof ResumeTextExtractionError) throw error;
    throw new ResumeTextExtractionError(
      400,
      "This PDF could not be processed. Upload a readable PDF, DOCX, or TXT resume.",
      "pdf-extraction-failed",
    );
  } finally {
    await loadingTask?.destroy();
  }
}

export async function extractResumeText(buffer, fileName) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new ResumeTextExtractionError(400, "The resume file is empty or invalid.", "resume-file-empty");
  }
  const extension = fileName?.toLowerCase().split(".").pop();

  if (extension === "pdf") {
    return extractPdfText(buffer);
  }
  if (extension === "docx") {
    if (buffer.subarray(0, 4).toString() !== "PK\u0003\u0004") {
      throw new ResumeTextExtractionError(400, "The DOCX file is invalid. Upload a readable resume file.", "invalid-docx");
    }
    try {
      const result = await mammoth.extractRawText({ buffer });
      return validateExtractedText(result.value);
    } catch (error) {
      if (error instanceof ResumeTextExtractionError) throw error;
      throw new ResumeTextExtractionError(
        400,
        "This DOCX file could not be processed. Upload a readable PDF, DOCX, or TXT resume.",
        "docx-extraction-failed",
      );
    }
  }
  if (extension === "txt") {
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      return validateExtractedText(text);
    } catch (error) {
      if (error instanceof ResumeTextExtractionError) throw error;
      throw new ResumeTextExtractionError(400, "The TXT file must use readable UTF-8 text.", "invalid-txt-encoding");
    }
  }
  throw new ResumeTextExtractionError(400, "Upload a PDF, DOCX, or TXT resume.", "unsupported-resume-format");
}

export const resumeTextMimeTypes = Object.freeze({
  pdf: "application/pdf",
  docx: DOCX_MIME_TYPE,
  txt: "text/plain",
});
