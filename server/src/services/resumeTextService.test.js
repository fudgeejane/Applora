import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { extractResumeText, ResumeTextExtractionError } from "./resumeTextService.js";

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

test("TXT resume extraction decodes UTF-8 and normalizes whitespace", async () => {
  const text = await extractResumeText(
    Buffer.from("\uFEFFJordan Lee\n\nProduct designer   \n", "utf8"),
    "resume.txt",
  );
  assert.equal(text, "Jordan Lee\n\nProduct designer");
});

test("PDF resume extraction returns readable text instead of sending the PDF binary", async () => {
  const text = await extractResumeText(textPdf("Jordan Lee Product Designer"), "resume.pdf");
  assert.match(text, /Jordan Lee Product Designer/);
});

test("resume extraction rejects unsupported, empty, and invalid PDF inputs explicitly", async () => {
  await assert.rejects(
    extractResumeText(Buffer.from("resume"), "resume.rtf"),
    { name: "ResumeTextExtractionError", statusCode: 400, diagnosticCode: "unsupported-resume-format" },
  );
  await assert.rejects(
    extractResumeText(Buffer.alloc(0), "resume.txt"),
    { name: "ResumeTextExtractionError", statusCode: 400, diagnosticCode: "resume-file-empty" },
  );
  await assert.rejects(
    extractResumeText(Buffer.from("not pdf"), "resume.pdf"),
    { name: "ResumeTextExtractionError", statusCode: 400, diagnosticCode: "invalid-pdf" },
  );
});

test("resume extraction rejects unreadable DOCX and malformed UTF-8", async () => {
  await assert.rejects(
    extractResumeText(Buffer.from("not a zip"), "resume.docx"),
    { name: "ResumeTextExtractionError", statusCode: 400, diagnosticCode: "invalid-docx" },
  );
  await assert.rejects(
    extractResumeText(Buffer.from([0xc3, 0x28]), "resume.txt"),
    (error) => error instanceof ResumeTextExtractionError
      && error.diagnosticCode === "invalid-txt-encoding",
  );
});
