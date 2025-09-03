# FastDiagram VE Workspace

This repository contains a refactored version of the original `agentic-ve-partner` starter. It introduces a chat‑centric workspace that allows users to create VE projects, upload source documents, interact with a retrieval augmented chat assistant, explore FAST diagrams and ideas, and export reports. All data is stored on a Render persistent disk — no S3 configuration is required.

## Monorepo structure

- `backend/` – An Express API that exposes CRUD endpoints for projects (`/api/projects`), assets (`/api/assets`), chat (`/api/chat`), asynchronous tasks (`/api/tasks`) and image generation (`/api/image`). It retains the existing endpoints (`/ask`, `/fast`, `/ideas`, etc.) for backward compatibility.
- `frontend/` – A Next.js 14 app using the App Router and Tailwind CSS. It renders a sidebar of projects, a central chat pane with context chips, and a right drawer with tabs (Files, FAST, Ideas, Eval, Develop, Report).
- `backend/schema.sql` – SQL migrations defining the relational schema, including `projects`, `project_assets`, `conversations`, `messages`, `chunks`, `tasks` and existing VE tables.

## Running locally

You'll need Node.js 20, Postgres (with the `vector` extension enabled) and an OpenAI API key.

1. Install dependencies for the frontend and backend:

   ```bash
   cd agentic-ve-partner/backend && npm install
   cd ../frontend && npm install
   ```

2. Create a `.env` file in `backend/` based on `api.env.example` and set at least `OPENAI_API_KEY`, `JWT_SECRET`, and database connection details. For the web front‑end set `NEXT_PUBLIC_API_BASE` to the URL of your backend service (e.g. `http://localhost:4000`).

3. Initialise the database schema:

   ```bash
   cd backend
   node tools/run-schema.js
   ```

4. Start the backend:

   ```bash
   npm start
   ```

5. Start the frontend in another terminal:

   ```bash
   cd frontend
   npm run dev
   ```

6. Visit `http://localhost:3000` to create a new project and begin chatting.

## Deployment on Render

The `render.yaml` blueprint can be adapted to deploy both the backend and the frontend on Render. The backend should mount a persistent disk at `/data` and expose port 4000. The frontend can be deployed on Vercel or as a separate Render web service. Ensure that the following environment variables are configured on Render:

- `OPENAI_API_KEY` – your OpenAI API key.
- `JWT_SECRET` – secret used for session signing.
- `FILE_STORAGE_ROOT` – path to the persistent disk (`/data/uploads` by default).
- `REPORT_STORAGE_ROOT` – path to store generated reports (`/data/reports`).
- `DATABASE_URL` – connection string for Postgres with pgvector enabled.
- `N8N_BASE_URL` and `N8N_WEBHOOK_SECRET` – if using n8n for long running jobs.

## Seed script

A basic seed script can be added under `backend/tools/seed-demo.js` to insert a demo project and ingest a sample PDF. This is left as an exercise; see `backend/tools/run-schema.js` for inspiration.

## Testing

After deployment you can run through the acceptance criteria described in the project specification. The `Projects` page lets you create a project and upload documents. The chat page shows ingestion progress and returns answers with citations. Quick actions for FAST, Ideas, Eval, Develop and Report can be wired up to call your existing agents and n8n workflows. A `/api/health` endpoint returns the status of the database, vector index, storage and n8n connectivity.