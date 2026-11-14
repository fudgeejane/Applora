import { Buffer } from "node:buffer";
import { fileURLToPath } from "node:url";
import mammoth from "mammoth";

const MAX_RESUME_TEXT_LENGTH = 40_000;
const MAX_PDF_PAGES = 100;
const MIN_PDF_TEXT_LENGTH = 20;
const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export class ResumeTextExtractionError extends Error {
  constructor(statusCode, publicMessage, diagnosticCode, options = {}) {
    super(publicMessage, options.cause ? { cause: options.cause } : undefined);
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

function isCorruptPdfError(error) {
  return ["FormatError", "InvalidPDFException", "MissingPDFException", "XRefParseException"]
    .includes(error?.name)
    || /invalid pdf structure|invalid xref|unexpected eof/i.test(String(error?.message || ""));
}

async function extractPdfText(buffer) {
  if (buffer.subarray(0, 5).toString() !== "%PDF-") {
    const error = new Error("PDF signature is missing.");
    console.error("PDF resume extraction failed:", {
      code: "pdf-corrupt",
      fileSizeBytes: buffer.length,
      extractedTextLength: 0,
      error: error.stack,
    });
    throw new ResumeTextExtractionError(
      400,
      "This PDF is corrupt or invalid. Upload a readable PDF, DOCX, or TXT resume.",
      "pdf-corrupt",
      { cause: error },
    );
  }

  let document;
  let loadingTask;
  let extractedTextLength = 0;
  try {
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
    loadingTask = getDocument({
      data: new Uint8Array(buffer),
      isEvalSupported: false,
      standardFontDataUrl: fileURLToPath(new URL("../../node_modules/pdfjs-dist/standard_fonts/", import.meta.url))
        .replace(/\\/g, "/"),
      useWorkerFetch: false,
    });
    document = await loadingTask.promise;
    if (document.numPages > MAX_PDF_PAGES) {
      console.error("PDF resume exceeds the page extraction limit:", {
        code: "pdf-too-large",
        fileSizeBytes: buffer.length,
        extractedTextLength,
      });
      throw new ResumeTextExtractionError(
        413,
        "This PDF has too many pages to analyze. Upload a shorter resume.",
        "pdf-too-large",
      );
    }

    const pages = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => (typeof item.str === "string" ? item.str : ""))
        .filter(Boolean)
        .join(" ");
      extractedTextLength += pageText.length;
      pages.push(pageText);
    }
    const normalizedText = normalizeText(pages.join("\n\n"));
    extractedTextLength = normalizedText.length;
    if (normalizedText.length < MIN_PDF_TEXT_LENGTH) {
      console.error("PDF resume contains too little readable text:", {
        code: "pdf-empty-text",
        fileSizeBytes: buffer.length,
        extractedTextLength: normalizedText.length,
      });
      // TODO: Add OCR fallback for scanned/image-only resumes.
      throw new ResumeTextExtractionError(
        400,
        "This PDF has no readable text or too little text to analyze. It may be scanned or image-only; upload a text-based PDF, DOCX, or TXT resume.",
        "pdf-empty-text",
      );
    }
    if (normalizedText.length > MAX_RESUME_TEXT_LENGTH) {
      console.error("PDF resume exceeds the text extraction limit:", {
        code: "pdf-too-large",
        fileSizeBytes: buffer.length,
        extractedTextLength: normalizedText.length,
      });
      throw new ResumeTextExtractionError(
        413,
        "This resume contains too much text to analyze. Shorten it and try again.",
        "pdf-too-large",
      );
    }
    return normalizedText;
  } catch (error) {
    if (error instanceof ResumeTextExtractionError) throw error;
    const diagnosticCode = isCorruptPdfError(error) ? "pdf-corrupt" : "pdf-extraction-failed";
    console.error("PDF resume extraction failed:", {
      code: diagnosticCode,
      fileSizeBytes: buffer.length,
      extractedTextLength,
      error: error?.cause?.stack || error?.stack || String(error),
    });
    throw new ResumeTextExtractionError(
      400,
      diagnosticCode === "pdf-corrupt"
        ? "This PDF is corrupt or invalid. Upload a readable PDF, DOCX, or TXT resume."
        : "This PDF could not be processed. Upload a readable PDF, DOCX, or TXT resume.",
      diagnosticCode,
      { cause: error },
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
