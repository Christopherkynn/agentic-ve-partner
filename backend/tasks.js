// API routes for managing asynchronous tasks. Tasks represent long
// running operations like document ingest, report generation or image
// rendering. The front‑end polls these endpoints to display live
// status updates in the UI. This router defines endpoints for
// creating tasks, checking their status and receiving n8n callbacks.

import { Router } from 'express';
import { pool } from './db.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// POST /api/tasks/create
// Enqueue a new task. The type must be one of the supported job
// categories. The payload field stores arbitrary JSON to be passed to
// n8n. Once inserted, the task will have status 'queued'. The
// external_ref field will be populated by the n8n flow when the
// webhook triggers.
router.post('/create', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const { projectId, type, payload } = req.body || {};
    if (!projectId || !type) return res.status(400).json({ error: 'projectId and type are required' });
    const validTypes = ['INGEST', 'REPORT', 'REINDEX', 'IMAGE'];
    if (!validTypes.includes(type)) return res.status(400).json({ error: 'invalid task type' });
    const taskId = uuidv4();
    await pool.query(
      `INSERT INTO tasks (id, project_id, type, status, payload, created_at, updated_at)
       VALUES ($1, $2, $3, 'queued', $4::jsonb, now(), now())`,
      [taskId, projectId, type, JSON.stringify(payload || {})]
    );
    res.status(201).json({ id: taskId, status: 'queued' });
  } catch (err) {
    console.error('[tasks.create]', err);
    res.status(500).json({ error: 'failed to create task' });
  }
});

// GET /api/tasks/status
// Query the status of a task by id. Returns the current status and any
// associated artifacts recorded in the payload. This endpoint can be
// polled from the front‑end to display progress bars or status pills.
router.get('/status', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id required' });
    const { rows } = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'task not found' });
    const task = rows[0];
    // TODO: optionally filter artifacts based on user visibility
    res.json({ id: task.id, status: task.status, payload: task.payload, external_ref: task.external_ref, created_at: task.created_at, updated_at: task.updated_at });
  } catch (err) {
    console.error('[tasks.status]', err);
    res.status(500).json({ error: 'failed to fetch task' });
  }
});

// POST /api/tasks/callback
// n8n flows call this endpoint when a job completes. The body should
// include the task id, new status and any artifact references. This
// route updates the tasks table accordingly and stores the returned
// artifacts in project_assets if provided. No authentication is
// enforced here — n8n should include its own secret in the request
// body which can be validated if necessary.
router.post('/callback', async (req, res) => {
  try {
    const { id, status, artifacts = [], externalRef } = req.body || {};
    if (!id || !status) return res.status(400).json({ error: 'id and status required' });
    // Update task status and external ref
    await pool.query(
      `UPDATE tasks SET status = $2, external_ref = $3, updated_at = now() WHERE id = $1`,
      [id, status, externalRef || null]
    );
    // Insert returned artifacts into project_assets
    for (const art of artifacts) {
      const { projectId, kind, filename, contentType, bytes, storageUri, checksum } = art;
      await pool.query(
        `INSERT INTO project_assets (project_id, kind, filename, content_type, bytes, storage_uri, checksum, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
        [projectId, kind, filename, contentType, bytes, storageUri, checksum]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[tasks.callback]', err);
    res.status(500).json({ error: 'failed to process callback' });
  }
});

export default router;