import { Router } from 'express';
import { pool } from './db.js';
import { authenticate } from './auth.js';

const router = Router();

/**
 * GET /evaluate/:projectId
 * Fetch evaluation criteria and current scores for a project.
 */
router.get('/:projectId', authenticate, async (req, res) => {
  const { projectId } = req.params;
  try {
    const { rows: criteria } = await pool.query('SELECT id, name, weight FROM criteria WHERE project_id = $1 ORDER BY created_at', [projectId]);
    const { rows: scores } = await pool.query('SELECT idea_id, criterion_id, score FROM scores WHERE project_id = $1', [projectId]);
    res.json({ criteria, scores });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to fetch evaluation data' });
  }
});

/**
 * POST /evaluate/:projectId/criteria
 * Set or update evaluation criteria with weights. Expects JSON: { criteria: [{ id?, name, weight }] }
 */
router.post('/:projectId/criteria', authenticate, async (req, res) => {
  const { projectId } = req.params;
  const { criteria } = req.body || {};
  if (!Array.isArray(criteria)) return res.status(400).json({ error: 'criteria array required' });
  try {
    // Replace all criteria for the project
    await pool.query('DELETE FROM criteria WHERE project_id = $1', [projectId]);
    const out = [];
    for (const c of criteria) {
      const { rows: [row] } = await pool.query(
        'INSERT INTO criteria (project_id, name, weight) VALUES ($1, $2, $3) RETURNING id, name, weight',
        [projectId, c.name, c.weight]
      );
      out.push(row);
    }
    res.json({ criteria: out });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to save criteria' });
  }
});

/**
 * POST /evaluate/:projectId/score
 * Submit scores for ideas and compute totals. Expects JSON: { scores: [ { ideaId, criterionId, score } ] }
 */
router.post('/:projectId/score', authenticate, async (req, res) => {
  const { projectId } = req.params;
  const { scores } = req.body || {};
  if (!Array.isArray(scores)) return res.status(400).json({ error: 'scores array required' });
  try {
    // Remove existing scores for project
    await pool.query('DELETE FROM scores WHERE project_id = $1', [projectId]);
    for (const s of scores) {
      await pool.query(
        'INSERT INTO scores (project_id, idea_id, criterion_id, score) VALUES ($1, $2, $3, $4)',
        [projectId, s.ideaId, s.criterionId, s.score]
      );
    }
    // Compute weighted totals
    const { rows: totals } = await pool.query(
      `SELECT i.id AS idea_id, i.description,
              SUM(sc.score * c.weight) AS total
       FROM ideas i
       JOIN scores sc ON sc.idea_id = i.id
       JOIN criteria c ON c.id = sc.criterion_id
       WHERE i.project_id = $1
       GROUP BY i.id
       ORDER BY total DESC`,
      [projectId]
    );
    res.json({ totals });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to compute scores' });
  }
});

export default router;