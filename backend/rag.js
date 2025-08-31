import { Router } from "express";
import { pool } from "./db.js";
import OpenAI from "openai";

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post("/embed", async (req,res) => {
  try {
    const chunks = req.body?.chunks || [];
    if (!chunks.length) return res.status(400).json({error:"no chunks"});
    const inputs = chunks.map(c => c.content);
    const e = await openai.embeddings.create({ model:"text-embedding-3-large", input: inputs });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (let i=0;i<chunks.length;i++){
        const { document_id, idx, content } = chunks[i];
        await client.query(
          "INSERT INTO chunks (document_id, idx, content, embedding) VALUES ($1,$2,$3,$4)",
          [document_id, idx, content, e.data[i].embedding]
        );
      }
      await client.query("COMMIT");
    } catch (err){
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
    res.json({ ok:true, count: chunks.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "embed_failed" });
  }
});

router.post("/query", async (req, res) => {
  try {
    const { projectId, question, phase } = req.body || {};
    if (!projectId || !question) return res.status(400).json({error:"projectId and question required"});

    const e = await openai.embeddings.create({ model:"text-embedding-3-large", input: `${phase||""}\n${question}`});
    const vec = e.data[0].embedding;

    const { rows } = await pool.query(`
      SELECT d.name, c.content, 1 - (c.embedding <=> $1::vector) AS score
      FROM chunks c
      JOIN documents d ON c.document_id = d.id
      WHERE d.project_id = $2
      ORDER BY c.embedding <=> $1::vector
      LIMIT 8
    `, [vec, projectId]);

    const context = rows.map(r => `【${r.name}】\n${r.content}`).join("\n---\n");

    const prompt = \`
You are a Value Engineering (VE) copilot.
PHASE=\${phase||'n/a'}
QUESTION=\${question}

Use the sources below to answer precisely. Attribute with a short citations appendix.
SOURCES:
\${context}
\`.trim();

    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role:"system", content: "Be precise. Cite sources. If unknown, say so." },
        { role:"user", content: prompt }
      ]
    });

    res.json({ answer: chat.choices[0].message.content, topSources: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "query_failed" });
  }
});

export default router;
