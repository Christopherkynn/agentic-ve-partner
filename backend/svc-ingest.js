// backend/svc-ingest.js
import { Router } from "express";
import { pool } from "./db.js";
import OpenAI from "openai";
import pdfParse from "pdf-parse";
import { v4 as uuidv4 } from "uuid";

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// pgvector wants [a,b,c] (NOT Postgres array {a,b,c})
const toVec = (arr) => `[${arr.join(",")}]`;

function chunkText(txt, maxLen = 1600) {
  const parts = txt.split(/\n+/).map(s => s.trim()).filter(Boolean);
  const out = [];
  let buf = "";
  for (const p of parts) {
    if ((buf + " " + p).length > maxLen) {
      if (buf) out.push(buf.trim());
      buf = p;
    } else {
      buf = buf ? `${buf} ${p}` : p;
    }
  }
  if (buf) out.push(buf.trim());
  return out;
}

async function embedAndStore(document_id, pieces) {
  const e = await openai.embeddings.create({ model: "text-embedding-3-large", input: pieces });
  for (let i = 0; i < pieces.length; i++) {
    await pool.query(
      "INSERT INTO chunks (document_id, idx, content, embedding) VALUES ($1,$2,$3,$4::vector)",
      [document_id, i, pieces[i], toVec(e.data[i].embedding)]
    );
  }
  return pieces.length;
}

// Optional helper (rarely used directly)
router.post("/create-doc", async (req, res) => {
  const { projectId, name } = req.body || {};
  if (!projectId || !name) return res.status(400).json({ error: "projectId and name required" });
  const id = uuidv4();
  await pool.query("INSERT INTO documents(id, project_id, name) VALUES ($1,$2,$3)", [id, projectId, name]);
  res.json({ docId: id });
});

// Ingest a public PDF by URL
router.post("/from-url", async (req, res) => {
  try {
    const { projectId, url, name } = req.body || {};
    if (!projectId || !url) return res.status(400).json({ error: "projectId and url required" });

    const docName = name || url.split("/").pop().split("?")[0] || "Document.pdf";
    const { rows } = await pool.query(
      "INSERT INTO documents(project_id, name) VALUES ($1,$2) RETURNING id",
      [projectId, docName]
    );
    const document_id = rows[0].id;

    const r = await fetch(url);
    if (!r.ok) throw new Error(`Failed to download PDF: ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());

    const parsed = await pdfParse(buf);
    const clean = parsed.text.replace(/[\r\t]+/g, " ").replace(/ +/g, " ").trim();
    if (!clean) return res.status(400).json({ error: "No text extracted from PDF" });

    const pieces = chunkText(clean);
    const count = await embedAndStore(document_id, pieces);
    res.json({ ok: true, projectId, docId: document_id, chunks: count, name: docName });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "ingest_from_url_failed" });
  }
});

// Ingest raw/plain text
router.post("/plaintext", async (req, res) => {
  try {
    const { projectId, name, text } = req.body || {};
    if (!projectId || !name || !text) return res.status(400).json({ error: "projectId, name, text required" });

    const { rows } = await pool.query(
      "INSERT INTO documents(project_id, name) VALUES ($1,$2) RETURNING id",
      [projectId, name]
    );
    const document_id = rows[0].id;

    const pieces = chunkText(text);
    const count = await embedAndStore(document_id, pieces);
    res.json({ ok: true, projectId, docId: document_id, chunks: count, name });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "ingest_plaintext_failed" });
  }
});

export default router;
