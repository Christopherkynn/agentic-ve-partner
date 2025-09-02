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

// Configure CORS to allow requests from the frontend URL provided in env
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Mount routers
app.use('/files', files);
app.use('/', ask); // exposes POST /ask
app.use('/fast', fastRouter);
app.use('/ideas', ideas);
app.use('/evaluate', evaluate);
app.use('/develop', develop);
app.use('/report', report);
app.use('/n8n', n8nRouter);

// Health check endpoint: verify the persistent disk is writable
app.get('/health', async (_req, res) => {
  try {
    const tmpDir = process.env.FILE_STORAGE_ROOT || '/data/uploads';
    const testFile = path.join(tmpDir, 'healthcheck.tmp');
    await fs.writeFile(testFile, 'ok');
    const content = await fs.readFile(testFile, 'utf8');
    await fs.unlink(testFile);
    if (content === 'ok') {
      res.json({ ok: true });
    } else {
      res.status(500).json({ ok: false });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'disk not writable' });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Backend server listening on port ${port}`);
});