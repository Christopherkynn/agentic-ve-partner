// Image generation and annotation API. These endpoints wrap around the
// existing image creation tooling (such as a custom diffusion model or
// n8n workflow). They allow the front‑end to request concept sketches
// or annotate images within a project. Generated files are stored as
// project assets.

import { Router } from 'express';
import { pool } from './db.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// POST /api/image/generate
// Body: { projectId: string, prompt: string }
// This endpoint delegates image generation to a long‑running task. It
// creates a task of type 'IMAGE' with the given prompt and returns
// immediately. The client should poll the tasks API to get the
// generated file once the task completes. A direct implementation of
// synchronous generation can be wired here if your image tool is fast.
router.post('/generate', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const { projectId, prompt } = req.body || {};
    if (!projectId || !prompt) return res.status(400).json({ error: 'projectId and prompt required' });
    // Insert a new task to trigger n8n image generation
    const taskId = uuidv4();
    await pool.query(
      `INSERT INTO tasks (id, project_id, type, status, payload, created_at, updated_at)
       VALUES ($1, $2, 'IMAGE', 'queued', $3::jsonb, now(), now())`,
      [taskId, projectId, JSON.stringify({ prompt })]
    );
    // TODO: enqueue the actual workflow by calling your n8n webhook
    res.status(202).json({ id: taskId, status: 'queued' });
  } catch (err) {
    console.error('[image.generate]', err);
    res.status(500).json({ error: 'failed to enqueue image generation' });
  }
});

// POST /api/image/annotate
// Body: { projectId: string, imageId: string, annotations: any }
// Persists annotation metadata for an image. Clients can overlay labels
// or notes on top of generated images. Annotation data is stored in
// project_assets as JSON and can be retrieved later.
router.post('/annotate', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const { projectId, imageId, annotations } = req.body || {};
    if (!projectId || !imageId || !annotations) return res.status(400).json({ error: 'projectId, imageId and annotations required' });
    // Find the asset
    const { rows } = await pool.query(
      'SELECT * FROM project_assets WHERE id = $1 AND project_id = $2',
      [imageId, projectId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'image asset not found' });
    // Update the asset's metadata with annotation JSON. We'll store
    // annotations inside the checksum field for simplicity. A proper
    // implementation might use a dedicated annotations table.
    await pool.query(
      'UPDATE project_assets SET checksum = $1 WHERE id = $2',
      [JSON.stringify(annotations), imageId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[image.annotate]', err);
    res.status(500).json({ error: 'failed to annotate image' });
  }
});

export default router;