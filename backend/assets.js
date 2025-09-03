// API routes for handling project assets (files). This router supports
// uploading new files, listing assets belonging to a project and
// downloading a specific asset. Uploaded files are stored on the
// filesystem under the directory configured by `FILE_STORAGE_ROOT`.

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { pool } from './db.js';

const router = Router();

const FILE_ROOT = process.env.FILE_STORAGE_ROOT || '/data/uploads';
const upload = multer({ dest: FILE_ROOT });

// Ensure the file root exists at runtime. This helper will be
// synchronously invoked on first import. If the directory cannot be
// created, an exception will propagate and crash the server on boot.
await fs.mkdir(FILE_ROOT, { recursive: true });

// POST /api/assets
// Upload one or more files to a project. The route expects a
// multipart/form-data request with field name `files` and query
// parameter `projectId`. After storing the file on disk, a row is
// inserted into `project_assets` linking the file to the project. The
// response returns the inserted asset metadata.
router.post('/', upload.array('files'), async (req, res) => {
  try {
    const userId = req.user?.id;
    const { projectId } = req.body;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'no files uploaded' });
    }
    const assets = [];
    for (const file of req.files) {
      const { originalname, mimetype, size, filename } = file;
      const storagePath = path.join(FILE_ROOT, filename);
      const checksum = '';
      const { rows } = await pool.query(
        `INSERT INTO project_assets (project_id, kind, filename, content_type, bytes, storage_uri, checksum, created_at)
         VALUES ($1, 'upload', $2, $3, $4, $5, $6, now()) RETURNING id, project_id, kind, filename, content_type, bytes, storage_uri, created_at`,
        [projectId, originalname, mimetype, size, storagePath, checksum]
      );
      assets.push(rows[0]);
    }
    res.status(201).json({ assets });
  } catch (err) {
    console.error('[assets.upload]', err);
    res.status(500).json({ error: 'failed to upload files' });
  }
});

// GET /api/projects/:projectId/assets
// List assets belonging to a given project. Ensures the current user
// owns the project before returning data. The response includes basic
// metadata but omits the file contents.
router.get('/:projectId/assets', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { projectId } = req.params;
    const proj = await pool.query(
      'SELECT 1 FROM projects WHERE id = $1 AND owner_id = $2',
      [projectId, userId]
    );
    if (proj.rowCount === 0) return res.status(404).json({ error: 'project not found' });
    const { rows } = await pool.query(
      'SELECT id, kind, filename, content_type, bytes, storage_uri, checksum, created_at FROM project_assets WHERE project_id = $1 ORDER BY created_at DESC',
      [projectId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[assets.list]', err);
    res.status(500).json({ error: 'failed to list assets' });
  }
});

// GET /api/assets/:id/download
// Download a single asset by id. Verifies that the asset belongs to a
// project owned by the current user before streaming the file. Uses
// res.download to set appropriate headers.
router.get('/:id/download', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { rows } = await pool.query(
      'SELECT pa.*, p.owner_id FROM project_assets pa JOIN projects p ON pa.project_id = p.id WHERE pa.id = $1',
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'asset not found' });
    const asset = rows[0];
    if (asset.owner_id !== userId) return res.status(403).json({ error: 'forbidden' });
    const filePath = asset.storage_uri;
    return res.download(filePath, asset.filename);
  } catch (err) {
    console.error('[assets.download]', err);
    res.status(500).json({ error: 'failed to download asset' });
  }
});

export default router;