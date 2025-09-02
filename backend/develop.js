import { Router } from 'express';
import { pool } from './db.js';
import { authenticate } from './auth.js';

const router = Router();

/**
 * GET /develop/:projectId
 * Fetch write-ups for a project.
 */
router.get('/:projectId', authenticate, async (req, res) => {
  const { projectId } = req.params;
  try {
    const { rows } = await pool.query(
      'SELECT idea_id, writeup, cost_delta, schedule_delta, risks, benefits FROM writeups WHERE project_id = $1',
      [projectId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to fetch writeups' });
  }
});

/**
 * POST /develop/:projectId
 * Submit write-ups for selected ideas. Expects JSON: { writeups: [ { ideaId, writeup, costDelta?, scheduleDelta?, risks?, benefits? } ] }
 */
router.post('/:projectId', authenticate, async (req, res) => {
  const { projectId } = req.params;
  const { writeups } = req.body || {};
  if (!Array.isArray(writeups)) return res.status(400).json({ error: 'writeups array required' });
  try {
    await pool.query('DELETE FROM writeups WHERE project_id = $1', [projectId]);
    for (const w of writeups) {
      await pool.query(
        `INSERT INTO writeups (project_id, idea_id, writeup, cost_delta, schedule_delta, risks, benefits)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [projectId, w.ideaId, w.writeup, w.costDelta || null, w.scheduleDelta || null, w.risks || null, w.benefits || null]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to save writeups' });
  }
});

export default router;