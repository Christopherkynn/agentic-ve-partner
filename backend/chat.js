// Chat endpoint built on top of the RAG backend. This route accepts an
// array of messages and a project id, performs semantic search on
// previously ingested chunks, then calls the LLM to produce a
// response. Citations referencing the retrieved chunks are returned to
// the caller so the frontend can render context chips.

import { Router } from 'express';
import OpenAI from 'openai';
import { pool } from './db.js';

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Convert an embedding array into a Postgres vector literal. This helper
// mirrors the implementation used throughout the existing codebase.
const toVec = (arr) => `[${arr.join(',')}]`;

// POST /api/chat
// Body: { projectId: string, messages: Array<{role: 'user'|'assistant', content: string}>, phase?: string }
// Responds with { answer: string, citations: Array<{id, fileName, chunkIndex}> }
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const { projectId, messages = [], phase = null } = req.body || {};
    if (!projectId || messages.length === 0) {
      return res.status(400).json({ error: 'projectId and messages are required' });
    }
    // Only allow access to projects owned by the user
    const proj = await pool.query('SELECT 1 FROM projects WHERE id = $1 AND owner_id = $2', [projectId, userId]);
    if (proj.rowCount === 0) return res.status(404).json({ error: 'project not found' });
    // Determine the latest user question in the conversation
    const userMsg = messages.reverse().find(m => m.role === 'user');
    if (!userMsg) return res.status(400).json({ error: 'no user message provided' });
    const question = userMsg.content;
    // Embed the query with phase prefix if provided
    const embedInput = phase ? `${phase}\n${question}` : question;
    const embed = await openai.embeddings.create({ model: 'text-embedding-3-small', input: embedInput });
    const qvec = toVec(embed.data[0].embedding);
    // Retrieve top chunks for the project
    const { rows: chunks } = await pool.query(
      `SELECT dc.id, dc.text, dc.chunk_index, d.file_name,
              1 - (dc.embedding <=> $1::vector) AS score
       FROM doc_chunks dc
       JOIN documents d ON dc.document_id = d.id
       WHERE dc.project_id = $2
       ORDER BY dc.embedding <=> $1::vector
       LIMIT 8`,
      [qvec, projectId]
    );
    // Compose context for the LLM
    const context = chunks.map((c, i) => `Source ${i + 1} (file ${c.file_name}, chunk ${c.chunk_index}):\n${c.text}`).join('\n\n');
    const systemPrompt = `You are a helpful Value Engineering copilot. Use the provided sources to answer the user's question. Quote relevant phrases in your answer. If the information isn't present in the sources, say you don't know.`;
    const chatMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Question: ${question}\n\nSources:\n${context}` }
    ];
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: chatMessages,
      max_tokens: 600
    });
    const answer = completion.choices[0].message.content.trim();
    const citations = chunks.map((c, i) => ({ id: c.id, fileName: c.file_name, chunkIndex: c.chunk_index }));
    res.json({ answer, citations });
  } catch (err) {
    console.error('[chat]', err);
    res.status(500).json({ error: 'chat_failed' });
  }
});

export default router;