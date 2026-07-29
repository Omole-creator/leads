// Minimal PDF wrapper for the certificate. The artwork is rendered once as a
// PNG by `next/og` and embedded full-bleed on a single A4 landscape page, so
// the PDF and the PNG download are guaranteed to look identical.
import { PDFDocument } from "pdf-lib";

/** A4 landscape, in PostScript points. Matches the 2000x1414 (√2) canvas. */
export const PDF_PAGE_WIDTH = 841.89;
export const PDF_PAGE_HEIGHT = 595.28;

export async function pngToLandscapePdf(png: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle("JobMingle Certificate of Completion");
  doc.setProducer("JobMingle Leads");
  const image = await doc.embedPng(png);
  const page = doc.addPage([PDF_PAGE_WIDTH, PDF_PAGE_HEIGHT]);
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: PDF_PAGE_WIDTH,
    height: PDF_PAGE_HEIGHT,
  });
  return doc.save();
}
