import { Router } from 'express';
import OpenAI from 'openai';
import { pool } from './db.js';
import { authenticate } from './auth.js';

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper to convert an embedding array into a Postgres vector literal
const toVec = (arr) => `[${arr.join(',')}]`;

/**
 * POST /ask
 *
 * Answers a question using Retrieval Augmented Generation. Expects JSON
 * payload: { projectId, question, topK }
 */
router.post('/ask', authenticate, async (req, res) => {
  try {
    const { projectId, question, topK = 5 } = req.body || {};
    if (!projectId || !question) {
      return res.status(400).json({ error: 'projectId and question are required' });
    }
    // Embed the query
    const { data } = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: question
    });
    const queryEmbedding = data[0].embedding;
    // Retrieve the topK matching chunks
    const { rows: chunks } = await pool.query(
      `SELECT dc.id, dc.text, dc.chunk_index, d.file_name,
              1 - (dc.embedding <=> ${toVec(queryEmbedding)}) AS score
       FROM doc_chunks dc
       JOIN documents d ON dc.document_id = d.id
       WHERE dc.project_id = $1
       ORDER BY dc.embedding <=> ${toVec(queryEmbedding)}
       LIMIT $2`,
      [projectId, topK]
    );
    // Build a context string for OpenAI chat completions
    const context = chunks.map((c, i) => `Source ${i + 1} (file ${c.file_name}, chunk ${c.chunk_index}):\n${c.text}`).join('\n\n');
    const systemPrompt = `You are a helpful assistant. Use the provided sources to answer the user's question. Quote relevant phrases in your answer. If the information isn't present in the sources, say you don't know.`;
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Question: ${question}\n\nSources:\n${context}` }
    ];
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages,
      max_tokens: 400
    });
    const answer = completion.choices[0].message.content.trim();
    // Build citation info
    const citations = chunks.map((c, i) => ({ source: i + 1, fileName: c.file_name, chunk: c.chunk_index }));
    res.json({ answer, citations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to answer question' });
  }
});

export default router;