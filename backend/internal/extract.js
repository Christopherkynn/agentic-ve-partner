import fs from 'fs/promises';
import path from 'path';
// ⬇️ use internal implementation to bypass demo code
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

/**
 * Extract plain text from a file on disk. Currently supports PDFs.
 */
export async function extractText(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase();
  if (mimeType === 'application/pdf' || ext === '.pdf') {
    const data = await fs.readFile(filePath);
    const result = await pdfParse(data);   // <- we pass a Buffer, so no demo path
    return result.text || '';
  }
  // Future: add DOCX (mammoth) or OCR
  throw new Error(`Unsupported MIME type: ${mimeType}`);
}
