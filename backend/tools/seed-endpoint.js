import { Router } from "express";
import { pool } from "../db.js";
import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// pgvector wants [a,b,c] (NOT a Postgres array {a,b,c})
const toVec = (arr) => `[${arr.join(",")}]`;

router.post("/seed", async (_req, res) => {
  try {
    const client = await pool.connect();
    const projectId = uuidv4();
    const docId = uuidv4();

    // Tiny demo text so the project has one document with citations
    const text = `
Right-of-way (ROW) is restricted along the east side; avoid widening beyond 2 ft.
Bridge clearance must be maintained at 16 ft minimum.
Design speed is 45 mph; target LOS C at opening year.
Floodplain impacts must not increase BFE; follow local stormwater criteria.
Pedestrian crossing required at Station 23+50 with ADA ramps both sides.
    `.trim();

    const lines = text.split(/\n+/).map((t, i) => ({ idx: i, content: t.trim() })).filter(l => l.content.length);

    await client.query("BEGIN");
    await client.query("INSERT INTO projects(id, name) VALUES ($1,$2)", [projectId, "Seeded Project"]);
    await client.query("INSERT INTO documents(id, project_id, name) VALUES ($1,$2,$3)", [docId, projectId, "Constraints.txt"]);

    // Embed all lines and store as pgvector literals
    const e = await openai.embeddings.create({ model: "text-embedding-3-large", input: lines.map(l => l.content) });
    for (let i = 0; i < lines.length; i++) {
      await client.query(
        "INSERT INTO chunks (document_id, idx, content, embedding) VALUES ($1,$2,$3,$4::vector)",
        [docId, lines[i].idx, lines[i].content, toVec(e.data[i].embedding)]
      );
    }

    await client.query("COMMIT");
    client.release();
    return res.json({ projectId, docId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "seed_failed" });
  }
});

export default router;
