import { Router } from 'express';
import OpenAI from 'openai';
import { pool } from './db.js';
import { authenticate } from './auth.js';

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Create FAST nodes and edges tables if they don't exist (should be handled via migrations)

/**
 * GET /fast/:projectId/nodes
 * Return all FAST nodes for a project.
 */
router.get('/:projectId/nodes', authenticate, async (req, res) => {
  const { projectId } = req.params;
  try {
    const { rows } = await pool.query('SELECT id, label, type, data FROM fast_nodes WHERE project_id = $1 ORDER BY created_at', [projectId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to load FAST nodes' });
  }
});

/**
 * POST /fast/:projectId/nodes
 * Replace all FAST nodes for a project.
 */
router.post('/:projectId/nodes', authenticate, async (req, res) => {
  const { projectId } = req.params;
  const { nodes } = req.body || {};
  if (!Array.isArray(nodes)) return res.status(400).json({ error: 'nodes array required' });
  try {
    await pool.query('DELETE FROM fast_nodes WHERE project_id = $1', [projectId]);
    for (const node of nodes) {
      const { id, label, type, data } = node;
      await pool.query(
        `INSERT INTO fast_nodes (id, project_id, label, type, data) VALUES ($1,$2,$3,$4,$5)`,
        [id, projectId, label, type, data || {}]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to save FAST nodes' });
  }
});

/**
 * GET /fast/:projectId/edges
 */
router.get('/:projectId/edges', authenticate, async (req, res) => {
  const { projectId } = req.params;
  try {
    const { rows } = await pool.query('SELECT id, source, target, label FROM fast_edges WHERE project_id = $1', [projectId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to load FAST edges' });
  }
});

/**
 * POST /fast/:projectId/edges
 * Replace FAST edges for a project.
 */
router.post('/:projectId/edges', authenticate, async (req, res) => {
  const { projectId } = req.params;
  const { edges } = req.body || {};
  if (!Array.isArray(edges)) return res.status(400).json({ error: 'edges array required' });
  try {
    await pool.query('DELETE FROM fast_edges WHERE project_id = $1', [projectId]);
    for (const edge of edges) {
      const { id, source, target, label } = edge;
      await pool.query(
        `INSERT INTO fast_edges (id, project_id, source, target, label) VALUES ($1,$2,$3,$4,$5)`,
        [id, projectId, source, target, label || '']
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to save FAST edges' });
  }
});

/**
 * POST /fast/:projectId/generate
 * Generate a FAST diagram skeleton using OpenAI based on a provided objective.
 * Expects JSON: { objective }
 */
router.post('/:projectId/generate', authenticate, async (req, res) => {
  const { projectId } = req.params;
  const { objective } = req.body || {};
  if (!objective) return res.status(400).json({ error: 'objective required' });
  try {
    const prompt = `You are an expert in value engineering. Given the objective "${objective}", return a JSON array of function nodes and edges describing a basic FAST diagram. Each node should have an id, label and type (function, objective, function, etc.). Each edge should have id, source, target and optional label.`;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [ { role: 'user', content: prompt } ],
      max_tokens: 500,
    });
    const jsonText = completion.choices[0].message.content.trim();
    // Expecting the assistant to return JSON like { nodes: [...], edges: [...] }
    let graph;
    try {
      graph = JSON.parse(jsonText);
    } catch {
      return res.status(500).json({ error: 'failed to parse generated FAST diagram' });
    }
    // Persist the generated nodes and edges
    await pool.query('DELETE FROM fast_nodes WHERE project_id = $1', [projectId]);
    await pool.query('DELETE FROM fast_edges WHERE project_id = $1', [projectId]);
    for (const node of graph.nodes || []) {
      await pool.query(
        `INSERT INTO fast_nodes (id, project_id, label, type, data) VALUES ($1,$2,$3,$4,$5)`,
        [node.id, projectId, node.label, node.type || 'function', node.data || {}]
      );
    }
    for (const edge of graph.edges || []) {
      await pool.query(
        `INSERT INTO fast_edges (id, project_id, source, target, label) VALUES ($1,$2,$3,$4,$5)`,
        [edge.id, projectId, edge.source, edge.target, edge.label || '']
      );
    }
    res.json(graph);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to generate FAST diagram' });
  }
});

export default router;