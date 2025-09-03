-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table for authentication and role management
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT DEFAULT 'owner',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Projects table. Each project belongs to a user and represents a VE study.
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'ingesting',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Project assets. Stores uploaded files, generated diagrams and reports.
CREATE TABLE IF NOT EXISTS project_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  filename TEXT NOT NULL,
  content_type TEXT,
  bytes BIGINT,
  storage_uri TEXT NOT NULL,
  checksum TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Conversations hold a chat history for a given project. Future work
-- could allow multiple conversations per project or per user.
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Messages within a conversation. The `tool_call` column can store
-- structured JSON describing agentic tool calls (FAST, Ideas, Eval,
-- Develop, Report). Tokens in/out track usage and can be used for
-- billing or credit calculations.
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT,
  tool_call JSONB,
  tokens_in INT,
  tokens_out INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Documents hold metadata and file path on disk. These rows are
-- created as part of ingestion; text and embedding columns are
-- optional until extraction is complete.
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  text TEXT,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Chunks table for RAG. Stores embeddings for document segments. This
-- replaces the earlier doc_chunks table but is created with the same
-- columns for compatibility.
CREATE TABLE IF NOT EXISTS chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  text TEXT,
  metadata JSONB,
  embedding vector(1536),
  chunk_index INT
);

-- FAST nodes and edges tables
CREATE TABLE IF NOT EXISTS fast_nodes (
  id TEXT PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  label TEXT,
  type TEXT,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fast_edges (
  id TEXT PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  source TEXT,
  target TEXT,
  label TEXT
);

-- Ideas table
CREATE TABLE IF NOT EXISTS ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Criteria table for evaluation
CREATE TABLE IF NOT EXISTS criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Scores table mapping ideas to criteria
CREATE TABLE IF NOT EXISTS scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
  criterion_id UUID REFERENCES criteria(id) ON DELETE CASCADE,
  score NUMERIC
);

-- Write‑ups for selected ideas
CREATE TABLE IF NOT EXISTS writeups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
  writeup TEXT,
  cost_delta TEXT,
  schedule_delta TEXT,
  risks TEXT,
  benefits TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reports table storing generated report files
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  docx_path TEXT NOT NULL,
  pdf_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tasks table recording asynchronous workflows such as ingestion,
-- reindexing, report generation and image rendering.
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  payload JSONB,
  external_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast vector searches on chunks
-- Note: The ivfflat index requires vector dimensions under 2000 and may
-- not be available on some Render Postgres plans. To avoid deployment
-- failures we omit this index by default. You can add it manually via
-- psql once pgvector is upgraded and configured.
-- CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks USING ivfflat (embedding vector_cosine_ops);