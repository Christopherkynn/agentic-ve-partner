import { Router } from 'express';
import { Document, Paragraph, Packer, HeadingLevel, TextRun } from 'docx';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { pool } from './db.js';
import { authenticate } from './auth.js';
import jwt from 'jsonwebtoken';

const router = Router();
const REPORT_STORAGE_ROOT = process.env.REPORT_STORAGE_ROOT || '/data/reports';

// Ensure report directory exists
await fs.mkdir(REPORT_STORAGE_ROOT, { recursive: true });

/**
 * GET /report/:projectId/export
 * Generate a DOCX and PDF report for the project and return download tokens.
 */
router.get('/:projectId/export', authenticate, async (req, res) => {
  const { projectId } = req.params;
  try {
    // Query project details
    const { rows: [project] } = await pool.query('SELECT id, name, created_at FROM projects WHERE id = $1', [projectId]);
    if (!project) return res.status(404).json({ error: 'project not found' });
    // Documents
    const { rows: docs } = await pool.query('SELECT file_name FROM documents WHERE project_id = $1', [projectId]);
    // Ideas and writeups
    const { rows: ideas } = await pool.query('SELECT i.description, w.writeup, w.cost_delta, w.schedule_delta, w.risks, w.benefits
                                              FROM ideas i
                                              LEFT JOIN writeups w ON w.idea_id = i.id
                                              WHERE i.project_id = $1', [projectId]);
    // Build DOCX
    const doc = new Document({ sectionBreaks: [] });
    doc.addSection({
      children: [
        new Paragraph({ text: project.name || 'VE Report', heading: HeadingLevel.TITLE }),
        new Paragraph({ text: `Project ID: ${project.id}`, spacing: { after: 200 } }),
        new Paragraph({ text: 'Documents:', heading: HeadingLevel.HEADING_2 }),
        ...docs.map(d => new Paragraph({ text: d.file_name, bullet: { level: 0 } })),
        new Paragraph({ text: 'Ideas and Write-ups:', heading: HeadingLevel.HEADING_2 }),
        ...ideas.map(i => new Paragraph({
          children: [
            new TextRun({ text: `Idea: ${i.description}\n`, bold: true }),
            new TextRun({ text: `Write-up: ${i.writeup || 'N/A'}\n` }),
            new TextRun({ text: `Cost Delta: ${i.cost_delta || 'N/A'}\n` }),
            new TextRun({ text: `Schedule Delta: ${i.schedule_delta || 'N/A'}\n` }),
            new TextRun({ text: `Risks: ${i.risks || 'N/A'}\n` }),
            new TextRun({ text: `Benefits: ${i.benefits || 'N/A'}\n\n` })
          ]
        }))
      ]
    });
    const buffer = await Packer.toBuffer(doc);
    const timestamp = Date.now();
    const baseName = `${projectId}_${timestamp}`;
    const docxPath = path.join(REPORT_STORAGE_ROOT, `${baseName}.docx`);
    await fs.writeFile(docxPath, buffer);
    // Create a simple PDF summarising the report
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;
    let y = page.getHeight() - 50;
    page.drawText(project.name || 'VE Report', { x: 50, y, size: 18, font });
    y -= 30;
    page.drawText(`Project ID: ${project.id}`, { x: 50, y, size: fontSize, font });
    y -= 30;
    page.drawText('Ideas Summary:', { x: 50, y, size: 14, font });
    y -= 20;
    for (const i of ideas) {
      if (y < 80) {
        // new page if near bottom
        const newPage = pdfDoc.addPage([595.28, 841.89]);
        page = newPage;
        y = page.getHeight() - 50;
      }
      page.drawText(`• ${i.description}`, { x: 60, y, size: fontSize, font });
      y -= 20;
    }
    const pdfBytes = await pdfDoc.save();
    const pdfPath = path.join(REPORT_STORAGE_ROOT, `${baseName}.pdf`);
    await fs.writeFile(pdfPath, pdfBytes);
    // Insert into reports table
    const reportId = uuidv4();
    await pool.query(
      'INSERT INTO reports (id, project_id, docx_path, pdf_path) VALUES ($1,$2,$3,$4)',
      [reportId, projectId, docxPath, pdfPath]
    );
    // Generate download tokens
    const ttl = parseInt(process.env.DOWNLOAD_TOKEN_TTL || '300', 10);
    const docxToken = jwt.sign({ reportDoc: docxPath }, process.env.JWT_SECRET, { expiresIn: ttl });
    const pdfToken = jwt.sign({ reportPdf: pdfPath }, process.env.JWT_SECRET, { expiresIn: ttl });
    res.json({ reportId, docxToken, pdfToken, expiresIn: ttl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to export report' });
  }
});

/**
 * GET /report/download
 * Download a report file using a token (docx or pdf). Provide token as query param.
 */
router.get('/download', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'token required' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const filePath = payload.reportDoc || payload.reportPdf;
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === '.pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const fileName = path.basename(filePath);
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.sendFile(path.resolve(filePath));
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'invalid token' });
  }
});

export default router;