import { Router } from 'express';
import OpenAI from 'openai';
import { pool } from './db.js';
import { authenticate } from './auth.js';

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * GET /ideas/:projectId
 * Fetch all generated ideas for a project.
 */
router.get('/:projectId', authenticate, async (req, res) => {
  const { projectId } = req.params;
  try {
    const { rows } = await pool.query('SELECT id, description, category, created_at FROM ideas WHERE project_id = $1 ORDER BY created_at', [projectId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to load ideas' });
  }
});

/**
 * POST /ideas/:projectId/generate
 * Generate a list of creative improvement ideas for a given project using OpenAI.
 * Expects JSON: { focus }
 */
router.post('/:projectId/generate', authenticate, async (req, res) => {
  const { projectId } = req.params;
  const { focus } = req.body || {};
  try {
    const prompt = `You are an experienced value engineer. Generate a list of creative improvement ideas for the following focus: ${focus || 'general project'}. Provide each idea as a short sentence.`;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [ { role: 'user', content: prompt } ],
      max_tokens: 300
    });
    const text = completion.choices[0].message.content.trim();
    // Split into lines/ideas
    const ideas = text.split(/\n+/).map(s => s.replace(/^-\s*/, '').trim()).filter(Boolean);
    const results = [];
    for (const idea of ideas) {
      const { rows: [row] } = await pool.query(
        'INSERT INTO ideas (project_id, description) VALUES ($1, $2) RETURNING id, description, created_at',
        [projectId, idea]
      );
      results.push(row);
    }
    res.status(201).json({ ideas: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to generate ideas' });
  }
});

export default router;