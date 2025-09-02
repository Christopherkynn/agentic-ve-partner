import { Router } from 'express';
import { pool } from './db.js';
import { authenticate } from './auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * GET /projects
 * List all projects for the authenticated user.
 */
router.get('/', authenticate, async (req, res) => {
  const userId = req.user?.id;
  try {
    const { rows } = await pool.query('SELECT id, name, created_at FROM projects WHERE user_id = $1 ORDER BY created_at', [userId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to load projects' });
  }
});

/**
 * POST /projects
 * Create a new project for the authenticated user. Expects JSON: { name }
 */
router.post('/', authenticate, async (req, res) => {
  const userId = req.user?.id;
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const id = uuidv4();
    await pool.query('INSERT INTO projects (id, user_id, name) VALUES ($1,$2,$3)', [id, userId, name]);
    res.status(201).json({ id, name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to create project' });
  }
});

export default router;