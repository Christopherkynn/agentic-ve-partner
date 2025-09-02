import { Router } from 'express';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { pool } from './db.js';
import { authenticate } from './auth.js';

const router = Router();

const FILE_STORAGE_ROOT = process.env.FILE_STORAGE_ROOT || '/data/uploads';
const MAX_UPLOAD_MB = parseInt(process.env.MAX_UPLOAD_MB || '50', 10);

// Ensure the root directory exists at startup
await fs.mkdir(FILE_STORAGE_ROOT, { recursive: true });

// Configure Multer to stream uploads directly to disk under project-specific folders
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const { projectId } = req.body;
    if (!projectId) return cb(new Error('projectId required'));
    const dest = path.join(FILE_STORAGE_ROOT, projectId);
    try {
      await fs.mkdir(dest, { recursive: true });
    } catch (err) {
      return cb(err);
    }
    cb(null, dest);
  },
  filename: function (_req, file, cb) {
    // Sanitize file name and prefix with a uuid to avoid collisions
    const safeName = file.originalname.replace(/[^A-Za-z0-9_.-]/g, '_');
    cb(null, `${uuidv4()}_${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 }
});

/**
 * POST /upload
 *
 * Accepts multipart/form-data with a single field `file` and a field `projectId`.
 * Stores the file on the persistent disk and records metadata in the database.
 */
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    const { projectId } = req.body;
    const { file } = req;
    if (!projectId || !file) {
      return res.status(400).json({ error: 'projectId and file required' });
    }
    const id = uuidv4();
    const filePath = file.path;
    const mimeType = file.mimetype;
    const sizeBytes = file.size;
    const fileName = file.originalname;
    await pool.query(
      `INSERT INTO documents (id, project_id, file_name, file_path, mime_type, size_bytes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())`,
      [id, projectId, fileName, filePath, mimeType, sizeBytes]
    );
    res.status(201).json({ ok: true, documentId: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to upload file' });
  }
});

/**
 * GET /download/:documentId
 *
 * Streams the file to the client. Requires authentication and ensures the
 * authenticated user owns the project. Ownership checks should be enforced
 * in production; here we simply verify the document exists.
 */
router.get('/download/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query('SELECT file_path, file_name, mime_type FROM documents WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'document not found' });
    const doc = rows[0];
    res.setHeader('Content-Type', doc.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${doc.file_name}"`);
    res.sendFile(path.resolve(doc.file_path));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to download file' });
  }
});

/**
 * GET /download-token/:documentId
 *
 * Issues a short-lived signed token that can be used to download a file
 * without requiring the Authorization header. The token encodes the
 * documentId and expires after a configurable number of seconds (default 5 minutes).
 */
router.get('/download-token/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const ttl = parseInt(process.env.DOWNLOAD_TOKEN_TTL || '300', 10);
  const token = jwt.sign({ docId: id }, process.env.JWT_SECRET, { expiresIn: ttl });
  res.json({ token, expiresIn: ttl });
});

/**
 * GET /download-by-token?token=...  (no auth header required)
 *
 * Validates the signed token and streams the associated file.
 */
router.get('/download-by-token', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'token required' });
  try {
    const { docId } = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query('SELECT file_path, file_name, mime_type FROM documents WHERE id = $1', [docId]);
    if (!rows.length) return res.status(404).json({ error: 'document not found' });
    const doc = rows[0];
    res.setHeader('Content-Type', doc.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${doc.file_name}"`);
    res.sendFile(path.resolve(doc.file_path));
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'invalid token' });
  }
});

export default router;