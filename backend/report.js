import { Router } from 'express';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { pool } from './db.js';
import { authenticate } from './auth.js';
import jwt from 'jsonwebtoken';

const router = Router();
const REPORT_ROOT = process.env.REPORT_STORAGE_ROOT || '/data/reports';

router.post('/export', authenticate, async (req, res) => {
  const { projectId } = req.body || {};
  if (!projectId) return res.status(400).json({ error: 'projectId required' });

  // Fetch project name
  const { rows: [proj] } = await pool.query('SELECT name FROM projects WHERE id = $1', [projectId]);

  // Fetch ideas joined with writeups
  const { rows: ideas } = await pool.query(
    `SELECT i.id, i.description,
            COALESCE(w.writeup, '') AS writeup,
            COALESCE(w.cost_delta, 0) AS cost_delta,
            COALESCE(w.schedule_delta, 0) AS schedule_delta,
            COALESCE(w.risks, '') AS risks,
            COALESCE(w.benefits, '') AS benefits
       FROM ideas i
       LEFT JOIN writeups w ON w.project_id = $1 AND w.idea_id = i.id
      WHERE i.project_id = $1
      ORDER BY i.created_at ASC`,
    [projectId]
  );

  // Build DOCX
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: `VE Report – ${proj?.name ?? projectId}`,
          heading: HeadingLevel.TITLE
        }),
        ...ideas.flatMap((r, idx) => ([
          new Paragraph({
            text: `Recommendation ${idx + 1}: ${r.description}`,
            heading: HeadingLevel.HEADING_1
          }),
          new Paragraph(new TextRun({ text: r.writeup || '—', break: 1 })),
          new Paragraph(`Cost Δ: ${r.cost_delta}`),
          new Paragraph(`Schedule Δ: ${r.schedule_delta}`),
          new Paragraph(`Risks: ${r.risks || '—'}`),
          new Paragraph(`Benefits: ${r.benefits || '—'}`),
        ]))
      ]
    }]
  });

  const bufDocx = await Packer.toBuffer(doc);

  // Ensure target dirs exist
  await fs.mkdir(REPORT_ROOT, { recursive: true });
  const id = uuidv4();
  const dir = path.join(REPORT_ROOT, projectId);
  await fs.mkdir(dir, { recursive: true });

  // Save DOCX
  const docxPath = path.join(dir, `${id}.docx`);
  await fs.writeFile(docxPath, bufDocx);

  // Minimal PDF (cover page)
  const pdf = await PDFDocument.create();
  const page = pdf.addPage();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText(`VE Report – ${proj?.name ?? projectId}`, { x: 50, y: page.getHeight() - 80, size: 18, font });
  const pdfBytes = await pdf.save();
  const pdfPath = path.join(dir, `${id}.pdf`);
  await fs.writeFile(pdfPath, pdfBytes);

  // Short-lived download token (10 minutes)
  const token = jwt.sign({ p: projectId, id, typ: 'report' }, process.env.JWT_SECRET, { expiresIn: '10m' });

  res.json({
    ok: true,
    report: {
      docx: { token, path: docxPath },
      pdf: { token, path: pdfPath }
    }
  });
});

router.get('/download', authenticate, async (req, res) => {
  const { token, format = 'docx' } = req.query || {};
  if (!token) return res.status(400).send('token required');
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload?.typ !== 'report') return res.status(403).send('bad token');

    const dir = path.join(REPORT_ROOT, payload.p);
    const filePath = path.join(dir, `${payload.id}.${format === 'pdf' ? 'pdf' : 'docx'}`);
    res.setHeader('Content-Disposition', `attachment; filename="VE-Report-${payload.p}.${format}"`);
    res.sendFile(filePath);
  } catch (e) {
    return res.status(401).send('invalid/expired token');
  }
});

export default router;
