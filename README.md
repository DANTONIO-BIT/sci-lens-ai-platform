# SciLens — AI Scientific Intelligence Platform

> **Transform research papers into actionable business intelligence.**  
> Upload a PDF → get TRL scoring, TAM estimation, risk analysis and a semantic research graph in seconds.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Supabase](https://img.shields.io/badge/Supabase-pgvector-3ECF8E?logo=supabase)](https://supabase.com)
[![OpenRouter](https://img.shields.io/badge/LLM-OpenRouter-7C3AED)](https://openrouter.ai)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/DANTONIO-BIT/sci-lens-ai-platform)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## What it does

Built for **pharma R&D teams, biotech VCs, and innovation analysts** who need to evaluate scientific papers quickly.

| Feature | Description |
|---|---|
| **Startup Potential Score** | TRL level (1–9), TAM estimate, regulatory complexity |
| **Risk Panel** | Technical, market, regulatory and competitive risk breakdown |
| **Key Findings** | Innovations, methods, applications and limitations extracted by AI |
| **Research Graph** | D3 force-directed network showing semantic connections between papers |
| **Magic Link Auth** | Passwordless login via Supabase — no passwords stored |
| **Demo Mode** | Full UI preview without any API keys configured |

---

## Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 · TypeScript · Tailwind 4 · shadcn/ui · Framer Motion · D3.js |
| **Backend** | FastAPI (Python 3.12) · PyMuPDF · Pydantic v2 |
| **AI — LLM** | OpenRouter (Llama 3.3 70B free / any model) |
| **AI — Embeddings** | Jina AI `jina-embeddings-v3` (1024 dims · 1M tokens/month free) |
| **Database** | Supabase (PostgreSQL + pgvector + Storage + Auth) |
| **Deploy** | Vercel (frontend) + Fly.io (backend, always-on free tier) |
| **Cost** | ~$0–5/month on free tiers |

---

## Quick Start — Local Dev

### 1. Clone and install

```bash
git clone https://github.com/DANTONIO-BIT/sci-lens-ai-platform.git
cd sci-lens-ai-platform
npm install
```

### 2. Run in Demo Mode (no keys needed)

```bash
cp .env.local.example .env.local
npm run dev                    # http://localhost:3000
```

The app runs fully in demo mode — 6 sample papers are preloaded with real analysis data. No Supabase or backend required.

### 3. Full stack — connect real services

**Frontend `.env.local`:**

```env
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Backend `backend/.env`** (copy from `backend/.env.example`):

```env
OPENROUTER_API_KEY=sk-or-v1-...
LLM_MODEL=meta-llama/llama-3.3-70b-instruct:free
JINA_API_KEY=jina_...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
FRONTEND_URL=http://localhost:3000
```

### 4. Database setup

In Supabase Dashboard → **SQL Editor → New query** → paste and run:

```
supabase/migrations/001_initial_schema.sql
```

This creates: pgvector extension, tables (papers, paper_chunks, paper_analysis, paper_connections), Storage bucket, RLS policies, and the semantic similarity function.

### 5. Run everything

```bash
# Terminal 1 — Frontend
npm run dev                                          # :3000

# Terminal 2 — Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000            # :8000
```

---

## API Keys (all free tiers)

| Service | Link | Free tier |
|---|---|---|
| **OpenRouter** | [openrouter.ai](https://openrouter.ai) → Keys | Free models: Llama 3.3 70B, Gemini Flash |
| **Jina AI** | [jina.ai](https://jina.ai) → API Key | 1M tokens/month |
| **Supabase** | [supabase.com](https://supabase.com) → New project | 500MB DB · 1GB Storage |

---

## Deploy to Production

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "feat: SciLens MVP — AI Scientific Intelligence Platform"
gh repo create sci-lens-ai-platform --public --source=. --push
```

### Step 2 — Frontend → Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → Import your GitHub repo
2. Framework: **Next.js** (auto-detected)
3. Add these environment variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...anon-key...` |
| `NEXT_PUBLIC_API_URL` | Your Fly.io URL (add after Step 3) |
| `NEXT_PUBLIC_DEMO_MODE` | `false` |

4. Deploy → copy your Vercel URL (e.g. `https://sci-lens.vercel.app`)

### Step 3 — Backend → Fly.io (no cold starts, always on)

```bash
# 1. Install Fly CLI (once)
brew install flyctl          # macOS
# or: curl -L https://fly.io/install.sh | sh

# 2. Login
fly auth login

# 3. Launch from the backend folder
cd backend
fly launch --name scilens-api --region iad --no-deploy

# 4. Set secrets (env vars)
fly secrets set \
  OPENROUTER_API_KEY=sk-or-v1-... \
  LLM_MODEL=meta-llama/llama-3.3-70b-instruct:free \
  JINA_API_KEY=jina_... \
  SUPABASE_URL=https://xxxx.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=eyJ... \
  FRONTEND_URL=https://sci-lens.vercel.app

# 5. Deploy
fly deploy
```

Your backend URL will be: `https://scilens-api.fly.dev`

> **Free tier**: 3 shared VMs, 256MB RAM, `min_machines_running = 1` in `fly.toml` keeps it always alive — no cold starts.

5. Copy `https://scilens-api.fly.dev` → paste into Vercel's `NEXT_PUBLIC_API_URL` → **Redeploy Vercel**

### Step 4 — Supabase Auth redirect URLs

Authentication → **URL Configuration**:
- **Site URL**: `https://sci-lens.vercel.app`
- **Redirect URLs**: `https://sci-lens.vercel.app/auth/callback`

### Step 5 — Verify

```bash
curl https://scilens-api.fly.dev/health
# → {"status":"ok","service":"scilens-api"}
```

Open your Vercel URL — login with magic link and upload your first paper.

---

## How the Pipeline Works

```
PDF Upload
    ↓
PyMuPDF → extract text + metadata
    ↓
Chunking (500 tokens, 50 overlap)
    ↓
Jina AI → 1024-dim embeddings → stored in pgvector
    ↓
OpenRouter LLM → structured JSON analysis
    (TRL · TAM · risks · findings · synthesis)
    ↓
pgvector similarity → find related papers → build graph
    ↓
Results available in UI
```

---

## Project Structure

```
sci-lens-ai-platform/
├── app/                         # Next.js App Router
│   ├── page.tsx                 # Landing page
│   ├── login/                   # Magic link auth
│   ├── dashboard/               # Papers library
│   ├── upload/                  # PDF upload + pipeline progress
│   ├── analysis/[id]/           # Full paper scorecard
│   ├── graph/                   # D3 research network
│   └── auth/callback/           # Supabase auth callback
├── components/
│   ├── analysis/                # TRL gauge, TAM card, risk panel, radar chart
│   ├── dashboard/               # Stats cards, recent papers, activity feed
│   ├── graph/                   # D3 force-directed research graph
│   ├── upload/                  # Dropzone, processing steps, progress bar
│   └── layout/                  # Sidebar, header, theme toggle
├── lib/
│   ├── api.ts                   # FastAPI HTTP client
│   ├── supabase.ts              # Supabase browser client
│   ├── supabase-server.ts       # Supabase server client (SSR)
│   ├── mock-data.ts             # Demo data — 6 papers with full analysis
│   └── types.ts                 # TypeScript types
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app + CORS
│   │   ├── config.py            # Settings from env vars
│   │   ├── routers/             # papers.py, graph.py
│   │   ├── services/            # pdf_parser, embeddings, llm_analyzer
│   │   └── models/              # Pydantic schemas
│   ├── Dockerfile               # Python 3.12 slim + PyMuPDF
│   ├── fly.toml                 # Fly.io deploy config (always-on, no cold start)
│   └── requirements.txt
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql   # pgvector + all tables + RLS
├── middleware.ts                # Auth guard + demo mode bypass
└── vercel.json                  # Vercel deploy config
```

---

## Roadmap

- [x] Phase 1 — PDF upload + AI scorecard (TRL, TAM, risk panel)
- [x] Phase 1 — Semantic research graph (pgvector + D3)
- [x] Phase 1 — Magic link auth (Supabase) + Demo mode
- [ ] Phase 2 — Competitive Landscape (OpenAlex API)
- [ ] Phase 2 — Patent Intelligence (USPTO + WIPO APIs)
- [ ] Phase 2 — Scientific Trend Forecasting
- [ ] Phase 3 — Internal Knowledge Graph (enterprise docs)
- [ ] Phase 3 — ROI Simulation Engine

---

## License

MIT — built by [@DANTONIO-BIT](https://github.com/DANTONIO-BIT)
