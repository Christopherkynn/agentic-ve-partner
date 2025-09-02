import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';

/**
 * Extract plain text from a file on disk. Currently supports PDFs. Future
 * enhancements could add support for DOCX (using a library like mammoth) and
 * image OCR.
 *
 * @param {string} filePath absolute path to the file
 * @param {string} mimeType MIME type of the file
 * @returns {Promise<string>} extracted text
 */
export async function extractText(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase();
  if (mimeType === 'application/pdf' || ext === '.pdf') {
    const data = await fs.readFile(filePath);
    const result = await pdfParse(data);
    return result.text || '';
  }
  // TODO: implement DOCX, image OCR and other formats
  throw new Error(`Unsupported MIME type: ${mimeType}`);
}