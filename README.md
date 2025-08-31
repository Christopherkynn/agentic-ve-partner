# Agentic VE Partner (FastDiagram.com) — Deployable Starter (Fixed Render Plan)

This repo is ready to push to GitHub and deploy:
- **Backend**: Express + pgvector RAG
- **Frontend**: Next.js minimal UI
- **n8n**: Workflows JSON
- **Render Blueprint** with **Postgres plan `basic-256mb`** (legacy `starter` removed)

## Quick Deploy (no local setup)
1) Create a new GitHub repo (empty). Push this folder there.
2) On **Render** → New → **Blueprint** → your repo.
   - Backend env vars: `OPENAI_API_KEY`, `JWT_SECRET`, optional `ALLOWED_ORIGINS`.
3) On **Vercel** → Import same repo.
   - Env var: `NEXT_PUBLIC_API_BASE` = your backend URL (from Render).
4) (Optional) Point GoDaddy DNS to Vercel + Render.

### Render note
Legacy Postgres plans like `starter` are no longer valid for **new** DBs. This `render.yaml` uses `plan: basic-256mb` with `postgresMajorVersion: '17'` and `diskSizeGB: 15`.


**Build fix:** Render now uses `npm install --omit=dev` for the backend and runs DB schema before starting the API. Node version pinned via `.node-version` (20.11.1) and `engines.node` in `backend/package.json`.
