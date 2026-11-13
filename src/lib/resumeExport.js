const A4_PAGE_WIDTH_TWIPS = 11906;
const A4_PAGE_HEIGHT_TWIPS = 16838;
const sectionHeadings = new Set([
  "PROFESSIONAL SUMMARY",
  "SUMMARY",
  "PROFILE",
  "PROFESSIONAL PROFILE",
  "EXPERIENCE",
  "WORK EXPERIENCE",
  "PROFESSIONAL EXPERIENCE",
  "EMPLOYMENT HISTORY",
  "EDUCATION",
  "ACADEMIC BACKGROUND",
  "SKILLS",
  "CORE SKILLS",
  "TECHNICAL SKILLS",
  "CERTIFICATIONS",
  "LICENSES",
  "PROJECTS",
  "SELECTED PROJECTS",
  "ACHIEVEMENTS",
  "AWARDS",
  "VOLUNTEER EXPERIENCE",
  "LEADERSHIP",
  "PUBLICATIONS",
  "LANGUAGES",
  "INTERESTS",
  "REFERENCES",
]);

function classifyLines(text) {
  const lines = text.split(/\r?\n/);
  const nonEmptyIndexes = lines.reduce((indexes, line, index) => {
    if (line.trim()) indexes.push(index);
    return indexes;
  }, []);
  const firstIndex = nonEmptyIndexes[0];
  const firstLine = firstIndex === undefined ? "" : lines[firstIndex].trim();
  const isName = firstLine && !isSectionHeading(firstLine);
  const nameIndex = isName ? firstIndex : -1;
  const nextIndex = nonEmptyIndexes.find((index) => index > nameIndex);
  const contactIndex = nextIndex !== undefined && /@|linkedin|https?:\/\/|(?:\+?\d[\d\s().-]{6,}\d)/i.test(lines[nextIndex])
    ? nextIndex
    : -1;

  return lines.map((line, index) => ({
    text: line,
    type: index === nameIndex
      ? "name"
      : index === contactIndex
        ? "contact"
        : isSectionHeading(line)
          ? "section"
          : "body",
  }));
}

function isSectionHeading(line) {
  const normalized = line.trim().replace(/^#+\s*/, "").replace(/:$/, "").replace(/\s+/g, " ").toUpperCase();
  return sectionHeadings.has(normalized);
}

function createPdfBlob(text) {
  return import("jspdf").then(({ jsPDF }) => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const marginX = 54;
    const marginTop = 48;
    const marginBottom = 48;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const maxLineWidth = pageWidth - marginX * 2;
    let cursorY = marginTop;
    let previousType = "";

    classifyLines(text).forEach(({ text: paragraph, type }) => {
      if (!paragraph.trim()) {
        cursorY += 7;
        previousType = "";
        return;
      }

      if (type === "section") cursorY += 8;
      const fontSize = type === "name" ? 18 : type === "section" ? 11 : type === "contact" ? 9 : 10.5;
      const lineHeight = type === "name" ? 23 : type === "section" ? 16 : 14;
      pdf.setFont("times", type === "name" || type === "section" ? "bold" : "normal");
      pdf.setFontSize(fontSize);
      const bullet = /^[•*-]\s/.test(paragraph);
      const indent = bullet && type === "body" ? 12 : 0;
      const wrapped = pdf.splitTextToSize(paragraph, maxLineWidth - indent);
      const isCentered = type === "name" || type === "contact";

      wrapped.forEach((line, lineIndex) => {
        if (cursorY + lineHeight > pageHeight - marginBottom) {
          pdf.addPage();
          cursorY = marginTop;
        }
        const x = isCentered
          ? pageWidth / 2
          : marginX + (bullet && lineIndex > 0 ? 12 : indent);
        pdf.text(line, x, cursorY, isCentered ? { align: "center" } : undefined);
        cursorY += lineHeight;
      });
      if (type === "section") {
        pdf.setDrawColor(85, 85, 85);
        pdf.setLineWidth(0.5);
        pdf.line(marginX, cursorY - 5, pageWidth - marginX, cursorY - 5);
        cursorY += 2;
      } else if (type === "name") {
        cursorY += 2;
      }
      if (type === "body" && previousType === "body") cursorY += 1;
      previousType = type;
    });

    return pdf.output("blob");
  });
}

async function createDocxBlob(text) {
  const { AlignmentType, Document, Packer, Paragraph, TextRun } = await import("docx");
  const paragraphs = classifyLines(text).map(({ text: line, type }) => {
    if (!line.trim()) return new Paragraph({ text: "", spacing: { after: 90 } });
    const isName = type === "name";
    const isContact = type === "contact";
    const isSection = type === "section";
    const bullet = /^[•*-]\s/.test(line) && type === "body";
    return new Paragraph({
      alignment: isName || isContact ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: {
        before: isSection ? 220 : 0,
        after: isName ? 100 : isContact ? 220 : isSection ? 90 : 80,
        line: 280,
      },
      indent: bullet ? { left: 360, hanging: 180 } : undefined,
      keepNext: isSection,
      children: [
        new TextRun({
          text: line,
          font: "Times New Roman",
          size: isName ? 32 : isContact ? 18 : isSection ? 22 : 20,
          bold: isName || isSection,
        }),
      ],
    });
  });
  const document = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: A4_PAGE_WIDTH_TWIPS, height: A4_PAGE_HEIGHT_TWIPS },
          margin: { top: 720, right: 900, bottom: 720, left: 900 },
        },
      },
      children: paragraphs,
    }],
  });
  return Packer.toBlob(document);
}

function saveBlob(blob, fileName) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export async function exportOptimizedResume(text, baseName, format) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("The optimized resume is empty.");
  }

  const normalizedFormat = String(format || "").toLowerCase();
  const fileName = `${baseName || "resume"}_optimized.${normalizedFormat}`;
  let blob;

  if (normalizedFormat === "txt") {
    blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  } else if (normalizedFormat === "docx") {
    blob = await createDocxBlob(text);
  } else if (normalizedFormat === "pdf") {
    blob = await createPdfBlob(text);
  } else {
    throw new Error("Choose TXT, DOCX, or PDF format.");
  }

  saveBlob(blob, fileName);
}

export function getExportBaseName(fileName) {
  return String(fileName || "resume")
    .replace(/\.[^.]+$/, "")
    .replace(/[<>:"/\\|?*]/g, "_")
    .trim() || "resume";
}
