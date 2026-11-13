import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { inflateRawSync } from "node:zlib";
import { exportOptimizedResume } from "./resumeExport.js";

function readZipEntry(zipBuffer, entryName) {
  const centralDirectorySignature = Buffer.from([0x50, 0x4b, 0x01, 0x02]);
  let offset = zipBuffer.indexOf(centralDirectorySignature);
  while (offset >= 0) {
    const compressionMethod = zipBuffer.readUInt16LE(offset + 10);
    const compressedSize = zipBuffer.readUInt32LE(offset + 20);
    const fileNameLength = zipBuffer.readUInt16LE(offset + 28);
    const extraLength = zipBuffer.readUInt16LE(offset + 30);
    const commentLength = zipBuffer.readUInt16LE(offset + 32);
    const localHeaderOffset = zipBuffer.readUInt32LE(offset + 42);
    const fileName = zipBuffer.toString("utf8", offset + 46, offset + 46 + fileNameLength);

    if (fileName === entryName) {
      const localFileNameLength = zipBuffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = zipBuffer.readUInt16LE(localHeaderOffset + 28);
      const contentOffset = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
      const compressedContent = zipBuffer.subarray(contentOffset, contentOffset + compressedSize);
      return compressionMethod === 0
        ? compressedContent.toString("utf8")
        : inflateRawSync(compressedContent).toString("utf8");
    }

    offset = zipBuffer.indexOf(centralDirectorySignature, offset + 46 + fileNameLength + extraLength + commentLength);
  }
  throw new Error(`Missing ZIP entry: ${entryName}`);
}

test("optimized resumes download as TXT, DOCX, and PDF", async () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const downloads = [];
  let currentBlob;

  globalThis.window = globalThis;
  globalThis.document = {
    body: { appendChild() {} },
    createElement() {
      return {
        click() {
          downloads.push({ name: this.download, blob: currentBlob });
        },
        remove() {},
      };
    },
  };
  URL.createObjectURL = (blob) => {
    currentBlob = blob;
    return `blob:resume-export-${downloads.length}`;
  };
  URL.revokeObjectURL = () => {};

  try {
    const text = "Jordan Lee\nPROFESSIONAL SUMMARY\nProduct designer";
    await exportOptimizedResume(text, "jordan-lee", "txt");
    await exportOptimizedResume(text, "jordan-lee", "docx");
    await exportOptimizedResume(text, "jordan-lee", "pdf");

    assert.deepEqual(downloads.map(({ name }) => name), [
      "jordan-lee_optimized.txt",
      "jordan-lee_optimized.docx",
      "jordan-lee_optimized.pdf",
    ]);
    assert.equal(await downloads[0].blob.text(), text);
    const docxBuffer = Buffer.from(await downloads[1].blob.arrayBuffer());
    const documentXml = readZipEntry(docxBuffer, "word/document.xml");
    assert.match(documentXml, /w:w="11906" w:h="16838"/);
    assert.match(documentXml, /PROFESSIONAL SUMMARY/);
    const pdfText = await downloads[2].blob.text();
    const pdfPageSize = pdfText.match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/);
    assert.ok(pdfPageSize);
    assert.ok(Math.abs(Number(pdfPageSize[1]) - 595.28) < 0.01);
    assert.ok(Math.abs(Number(pdfPageSize[2]) - 841.89) < 0.01);
    assert.match(pdfText, /PROFESSIONAL SUMMARY/);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  }
});
