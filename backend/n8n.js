import { Router } from 'express';
import { pool } from './db.js';
import { extractText } from './internal/extract.js';
import { embedBatch } from './internal/embedBatch.js';

const router = Router();

/**
 * POST /n8n/ingest
 * Trigger ingestion pipeline for a document. Expects JSON: { documentId }
 */
router.post('/ingest', async (req, res) => {
  const { documentId } = req.body || {};
  if (!documentId) return res.status(400).json({ error: 'documentId required' });
  try {
    const { rows: [doc] } = await pool.query('SELECT id, project_id, file_path, mime_type FROM documents WHERE id = $1', [documentId]);
    if (!doc) return res.status(404).json({ error: 'document not found' });
    // Extract text
    const text = await extractText(doc.file_path, doc.mime_type);
    // Insert or update document text and embedding
    // Compute embedding for full document
    // For simplicity we set embedding to null here; embed individual chunks only
    await pool.query('UPDATE documents SET text = $1 WHERE id = $2', [text, documentId]);
    // Chunk text
    const parts = text.split(/\n\n+/).map(s => s.trim()).filter(Boolean);
    // Remove existing chunks
    await pool.query('DELETE FROM doc_chunks WHERE document_id = $1', [documentId]);
    await embedBatch(parts, doc.project_id, documentId);
    res.json({ ok: true, chunks: parts.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to ingest document' });
  }
});

/**
 * POST /n8n/agent
 * Orchestrate agentic tasks. Expects JSON: { projectId, phase }
 */
router.post('/agent', async (req, res) => {
  const { projectId, phase } = req.body || {};
  if (!projectId || !phase) return res.status(400).json({ error: 'projectId and phase required' });
  try {
    // In a real implementation we would fan out to dedicated endpoints for each phase.
    // For now we just log the request and return a no-op response.
    console.log(`Agent orchestrator invoked for project ${projectId} phase ${phase}`);
    res.json({ ok: true, message: `Agent task for phase ${phase} queued` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to orchestrate agent task' });
  }
});

export default router;