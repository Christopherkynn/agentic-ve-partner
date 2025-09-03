// API routes for managing projects. This module exposes CRUD endpoints for
// creating, listing, updating and archiving projects. It is written as an
// Express router and is intended to be mounted under `/api/projects` from
// the top‑level server. These routes assume authentication middleware
// attaches the currently logged in user to `req.user` and will only
// return projects that belong to that user.

import { Router } from 'express';
import { pool } from './db.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Helper to generate a slug from a project title. Slugs are used as
// human‑friendly identifiers in URLs. This implementation lowercases
// the title, replaces spaces with hyphens and appends a random suffix
// to ensure uniqueness. Feel free to swap with a more robust slugifier.
function slugify(title) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
}

// GET /api/projects
// List all projects owned by the current user. Supports optional query
// parameters for searching or filtering. Currently this endpoint returns
// id, title, slug and status fields for each project. Additional
// metadata can be added as necessary.
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const { rows } = await pool.query(
      'SELECT id, title, slug, status, created_at, updated_at FROM projects WHERE owner_id = $1 ORDER BY updated_at DESC',
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[projects.list]', err);
    res.status(500).json({ error: 'failed to list projects' });
  }
});

// POST /api/projects
// Create a new project. Expects a JSON payload with a `title` field.
// Generates a slug and inserts a new row into the projects table. The
// newly created project is returned to the caller.
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const { title } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    const slug = slugify(title);
    const id = uuidv4();
    await pool.query(
      `INSERT INTO projects (id, owner_id, title, slug, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'ingesting', now(), now())`,
      [id, userId, title, slug]
    );
    res.status(201).json({ id, title, slug, status: 'ingesting' });
  } catch (err) {
    console.error('[projects.create]', err);
    res.status(500).json({ error: 'failed to create project' });
  }
});

// GET /api/projects/:id
// Retrieve a single project. Checks ownership and returns full row.
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM projects WHERE id = $1 AND owner_id = $2 LIMIT 1',
      [id, userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[projects.read]', err);
    res.status(500).json({ error: 'failed to fetch project' });
  }
});

// PATCH /api/projects/:id
// Update a project title or status. Accepts partial updates. For
// archiving or duplicating, clients can set `status` accordingly. Only
// owner can modify the project. Returns the updated row.
router.patch('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { title, status } = req.body;
    const fields = [];
    const values = [id, userId];
    if (title) {
      fields.push(`title = $${values.length + 1}`);
      values.push(title);
    }
    if (status) {
      fields.push(`status = $${values.length + 1}`);
      values.push(status);
    }
    if (fields.length === 0) return res.status(400).json({ error: 'no updates provided' });
    const setClause = fields.join(', ');
    const { rows } = await pool.query(
      `UPDATE projects SET ${setClause}, updated_at = now() WHERE id = $1 AND owner_id = $2 RETURNING *`,
      values
    );
    if (rows.length === 0) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[projects.update]', err);
    res.status(500).json({ error: 'failed to update project' });
  }
});

// DELETE /api/projects/:id
// Archive a project by setting its status to 'archived'. Physical
// deletion is avoided to preserve data integrity. Returns success
// indicator.
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { rowCount } = await pool.query(
      `UPDATE projects SET status = 'archived', updated_at = now() WHERE id = $1 AND owner_id = $2`,
      [id, userId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[projects.delete]', err);
    res.status(500).json({ error: 'failed to archive project' });
  }
});

export default router;