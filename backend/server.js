// backend/server.js
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs/promises';
import path from 'path';

import files from './files.js';
import ask from './ask.js';
import fastRouter from './fast.js';
import ideas from './ideas.js';
import evaluate from './evaluate.js';
import develop from './develop.js';
import report from './report.js';
import n8nRouter from './n8n.js';

const app = express();

// CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// STORAGE ROOTS
const FILE_ROOT   = process.env.FILE_STORAGE_ROOT   || '/data/uploads';
const REPORT_ROOT = process.env.REPORT_STORAGE_ROOT || '/data/reports';

// Ensure dirs & writability at startup
async function ensureWritableDir(dir) {
  await fs.mkdir(dir, { recursive: true });
  const testFile = path.join(dir, '.writetest');
  await fs.writeFile(testFile, 'ok');
  await fs.rm(testFile, { force: true });
}

(async () => {
  try {
    await ensureWritableDir(FILE_ROOT);
    await ensureWritableDir(REPORT_ROOT);
    console.log('[startup] storage roots are ready:', { FILE_ROOT, REPORT_ROOT });
  } catch (err) {
    console.error('[startup] storage not writable. On Render, attach a Persistent Disk at /data, and set FILE_STORAGE_ROOT/REPORT_STORAGE_ROOT accordingly.', err);
    process.exit(1);
  }
})();

// Routes
app.use('/files', files);
app.use('/', ask);              // POST /ask
app.use('/fast', fastRouter);
app.use('/ideas', ideas);
app.use('/evaluate', evaluate);
app.use('/develop', develop);
app.use('/report', report);
app.use('/n8n', n8nRouter);

// Health: write/read/remove test file inside FILE_ROOT
app.get('/health', async (_req, res) => {
  try {
    await fs.mkdir(FILE_ROOT, { recursive: true });
    const testFile = path.join(FILE_ROOT, 'healthcheck.tmp');
    await fs.writeFile(testFile, 'ok');
    const content = await fs.readFile(testFile, 'utf8');
    await fs.rm(testFile, { force: true });         // avoids ENOENT noise if already gone
    res.json({ ok: content === 'ok' });
  } catch (err) {
    console.error('[health] error:', err);
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Backend server listening on port ${port}`));
