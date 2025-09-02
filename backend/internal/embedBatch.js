import OpenAI from 'openai';
import { pool } from '../db.js';

// Helper to convert an embedding array into a Postgres vector literal
const toVec = (arr) => `[${arr.join(',')}]`;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Embed a batch of text chunks and insert them into the doc_chunks table.
 *
 * @param {string[]} chunks The text chunks to embed
 * @param {string} projectId The project to associate the chunks with
 * @param {string} documentId The document to associate the chunks with
 */
export async function embedBatch(chunks, projectId, documentId) {
  if (!chunks.length) return;
  // Request embeddings for all chunks in a single call where supported
  const { data } = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: chunks
  });
  let idx = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = data[i].embedding;
    await pool.query(
      `INSERT INTO doc_chunks (document_id, project_id, text, embedding, chunk_index)
       VALUES ($1, $2, $3, ${toVec(embedding)}, $4)`,
      [documentId, projectId, chunk, idx++]
    );
  }
}