import { Router } from "express";
import { pool } from "./db.js";
import OpenAI from "openai";

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const toVec = (arr) => `[${arr.join(",")}]`;

// RAG answer with citations
router.post("/query", async (req, res) => {
  try {
    const { projectId, question, phase } = req.body || {};
    if (!projectId || !question) return res.status(400).json({ error: "projectId and question required" });

    // Embed the query and pass as a pgvector literal
    const e = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: `${phase || ""}\n${question}`
    });
    const qvec = toVec(e.data[0].embedding);

    const { rows } = await pool.query(
      `
      SELECT d.name,
             c.content,
             1 - (c.embedding <=> $1::vector) AS score
      FROM chunks c
      JOIN documents d ON c.document_id = d.id
      WHERE d.project_id = $2
      ORDER BY c.embedding <=> $1::vector
      LIMIT 8
      `,
      [qvec, projectId]
    );

    const context = rows.map(r => `【${r.name}】\n${r.content}`).join("\n---\n");
    const prompt = `
You are a Value Engineering (VE) copilot.
PHASE=${phase || 'n/a'}
QUESTION=${question}

Use the sources below to answer precisely. Attribute with a short citations appendix.
SOURCES:
${context}
    `.trim();

    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Be precise. Cite sources. If unknown, say so." },
        { role: "user", content: prompt }
      ]
    });

    res.json({ answer: chat.choices[0].message.content, topSources: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "query_failed" });
  }
});

export default router;
