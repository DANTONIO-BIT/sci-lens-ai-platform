# SciLens — AI Scientific Intelligence Platform
## Architecture & Build Report · v1.0 · Mayo 2026

---

## 1. Visión del producto

**SciLens** es una plataforma SaaS web que transforma papers científicos en inteligencia estratégica accionable. El usuario sube uno o varios PDFs y obtiene en segundos un scorecard de potencial comercial, extracción estructurada de claims y métodos, y un grafo visual de conexiones entre investigaciones.

**Tagline:** *"Bloomberg Terminal for scientific research."*

**Objetivo de portfolio:** Demostrar capacidad de ejecución full-stack con AI generativa, RAG pipelines, y criterio de producto aplicado al sector biotech/pharma/agro. Proyecto completamente deployado y accesible online — no una herramienta local.

---

## 2. Features MVP (semanas 1–2)

### Feature 1 — Paper Ingestion & Extraction
- Drag & drop de PDF (hasta 50MB)
- Extracción automática: título, autores, abstract, keywords, métodos, datasets mencionados, claims principales
- Chunking en 512 tokens con overlap para búsqueda semántica posterior
- Generación de embeddings (OpenAI `text-embedding-3-small`)
- Almacenamiento en Supabase Storage + metadata en PostgreSQL

### Feature 2 — Startup Potential Score ⭐ (feature WOW)
La IA evalúa cada paper en 5 dimensiones y genera un scorecard JSON estructurado:

| Dimensión | Descripción |
|---|---|
| **TRL Level** | Technology Readiness Level (1–9) estimado |
| **Market Opportunity** | TAM estimado + descripción del mercado objetivo |
| **Regulatory Complexity** | Barrera FDA/EMA/EFSA — Low / Medium / High |
| **Technical Barriers** | Dificultad de replicación/escalado |
| **Startup Potential** | Score 0–100 con justificación textual |

Output: tarjeta visual con semáforo verde/amarillo/rojo + párrafo de síntesis generado por GPT-4o-mini.

### Feature 3 — Research Graph
- Visualización D3.js Force-directed de todos los papers del usuario
- Nodos = papers, aristas = similaridad semántica (cosine distance via pgvector)
- Clusters automáticos por tema (colores)
- Click en nodo → panel lateral con scorecard del paper

---

## 3. Stack técnico

### Frontend
```
Framework:    Next.js 14 (App Router)
Lenguaje:     TypeScript
Estilos:      Tailwind CSS + shadcn/ui
Gráficos:     D3.js (Research Graph) + Recharts (scorecards)
Animaciones:  Framer Motion
Deploy:       Vercel (Edge Network, CI/CD automático desde GitHub)
```

### Backend
```
Framework:    FastAPI (Python 3.12)
PDF parsing:  PyMuPDF (fitz) — rápido, sin dependencias pesadas
Chunking:     LangChain TextSplitter (500 tokens, overlap 50)
HTTP client:  httpx async
Deploy:       Railway (auto-deploy desde GitHub, free tier suficiente para MVP)
```

### AI Layer
```
Embeddings:   OpenAI text-embedding-3-small (1536 dims, $0.02/1M tokens)
LLM:          GPT-4o-mini (JSON mode para structured output)
RAG:          pgvector similarity search (cosine, IVFFlat index)
Prompt eng.:  System prompts especializados por tipo de análisis
```

### Data Layer
```
Base de datos: PostgreSQL en Supabase
Vector store:  pgvector (extensión nativa de Supabase — sin Pinecone ni Weaviate)
Storage:       Supabase Storage (bucket privado para PDFs)
Auth:          Supabase Auth (magic link email — sin passwords)
RLS:           Row Level Security en todas las tablas (multi-tenant seguro)
```

### Infraestructura
```
Frontend CI:   Vercel → auto-deploy en cada push a main
Backend CI:    Railway → Dockerfile en /backend
Secrets:       Vercel env vars + Railway env vars
Monitoring:    Vercel Analytics (free) + Railway logs
Domain:        Vercel free subdomain en MVP → custom domain en v1.1
```

---

## 4. Estructura del repositorio

```
scilens/
├── frontend/                  # Next.js 14
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx           # Library — lista de papers
│   │   │   ├── upload/page.tsx    # Upload + progreso
│   │   │   ├── papers/[id]/page.tsx  # Scorecard individual
│   │   │   └── graph/page.tsx     # Research Graph
│   │   └── api/
│   │       └── auth/callback/route.ts
│   ├── components/
│   │   ├── ui/                    # shadcn components
│   │   ├── PaperCard.tsx
│   │   ├── StartupScorecard.tsx
│   │   ├── ResearchGraph.tsx      # D3 force graph
│   │   └── UploadZone.tsx
│   └── lib/
│       ├── supabase.ts
│       └── api.ts                 # FastAPI client
│
├── backend/                   # FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/
│   │   │   ├── papers.py          # POST /papers/upload, GET /papers/{id}
│   │   │   ├── analysis.py        # POST /papers/{id}/analyze
│   │   │   └── graph.py           # GET /graph/connections
│   │   ├── services/
│   │   │   ├── pdf_parser.py      # PyMuPDF extraction
│   │   │   ├── embeddings.py      # OpenAI embeddings
│   │   │   ├── llm_analyzer.py    # GPT-4o-mini structured analysis
│   │   │   └── graph_builder.py   # Similarity computation
│   │   └── models/
│   │       └── schemas.py         # Pydantic models
│   ├── Dockerfile
│   └── requirements.txt
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── seed/
│       └── demo_papers.sql        # Papers públicos para demo
│
└── docker-compose.yml             # Dev local
```

---

## 5. Schema de base de datos

```sql
-- Habilitar pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Papers subidos por el usuario
CREATE TABLE papers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title         TEXT,
  authors       TEXT[],
  abstract      TEXT,
  keywords      TEXT[],
  file_url      TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  status        TEXT DEFAULT 'processing', -- processing | ready | error
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Chunks de texto con embeddings para RAG
CREATE TABLE paper_chunks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id      UUID REFERENCES papers(id) ON DELETE CASCADE,
  chunk_index   INTEGER NOT NULL,
  chunk_text    TEXT NOT NULL,
  embedding     VECTOR(1536),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON paper_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Análisis estructurado generado por LLM
CREATE TABLE paper_analysis (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id             UUID REFERENCES papers(id) ON DELETE CASCADE UNIQUE,
  trl_level            INTEGER,           -- 1-9
  startup_score        INTEGER,           -- 0-100
  market_opportunity   TEXT,
  tam_estimate         TEXT,
  regulatory_complexity TEXT,             -- low | medium | high
  technical_barriers   TEXT,
  synthesis            TEXT,              -- párrafo generado
  extracted_methods    TEXT[],
  extracted_claims     TEXT[],
  raw_json             JSONB,             -- respuesta completa del LLM
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- Conexiones semánticas entre papers (grafo)
CREATE TABLE paper_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id_a      UUID REFERENCES papers(id) ON DELETE CASCADE,
  paper_id_b      UUID REFERENCES papers(id) ON DELETE CASCADE,
  similarity      FLOAT NOT NULL,         -- 0.0 a 1.0
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(paper_id_a, paper_id_b, user_id)
);

-- Row Level Security: cada usuario solo ve sus datos
ALTER TABLE papers ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_papers" ON papers USING (auth.uid() = user_id);
CREATE POLICY "users_own_chunks" ON paper_chunks
  USING (paper_id IN (SELECT id FROM papers WHERE user_id = auth.uid()));
CREATE POLICY "users_own_analysis" ON paper_analysis
  USING (paper_id IN (SELECT id FROM papers WHERE user_id = auth.uid()));
CREATE POLICY "users_own_connections" ON paper_connections USING (auth.uid() = user_id);
```

---

## 6. API Endpoints (FastAPI)

```
POST   /papers/upload              Sube PDF a Supabase Storage, crea registro
GET    /papers/{id}                Metadata + status del paper
POST   /papers/{id}/analyze        Lanza pipeline: parse → embed → LLM analysis
GET    /papers/{id}/analysis       Devuelve scorecard completo
GET    /papers/{id}/similar        Top-5 papers más similares (pgvector)
GET    /graph                      Todos los nodos + aristas del usuario
POST   /graph/rebuild              Recalcula todas las conexiones
GET    /health                     Health check para Railway
```

---

## 7. Pantallas del producto

### Pantalla 1 — Library (home del dashboard)
Grid de paper cards con: título, autores, startup score (badge color), TRL badge, fecha de upload. Botón "Upload Paper" prominente.

### Pantalla 2 — Upload
Zona drag & drop para PDF. Barra de progreso en 4 etapas: *Uploading → Parsing → Generating embeddings → Analyzing*. Al completar, redirect automático al scorecard.

### Pantalla 3 — Scorecard (paper individual)
- Header: título, autores, abstract
- Startup Potential Score: número grande (0–100) con color semáforo
- Grid de métricas: TRL Level, TAM Estimate, Regulatory Complexity, Technical Barriers
- Synthesis: párrafo generado por IA
- Extracted data: keywords, methods, claims en chips
- Panel "Similar Papers": lista de los 3 más cercanos semánticamente

### Pantalla 4 — Research Graph
Canvas full-width con D3 force graph. Sidebar con filtros por score mínimo y año. Click en nodo abre mini-panel con scorecard resumido.

---

## 8. Plan de ejecución — 10 días

### Días 1–2: Setup & Auth
- Crear repo en GitHub con estructura definida
- Configurar Supabase: proyecto, schema SQL, Storage bucket, Auth magic link
- Setup Next.js con Tailwind + shadcn/ui + Supabase client
- Setup FastAPI con estructura de routers + Dockerfile
- Deploy inicial: Vercel (frontend vacío) + Railway (API con `/health`)
- Verificar pipeline CI/CD end-to-end

### Días 3–4: Upload Pipeline
- Componente `UploadZone.tsx` con drag & drop
- Endpoint `POST /papers/upload` — Supabase Storage + registro en DB
- PyMuPDF extraction: título, autores, abstract, texto completo
- Chunking + embeddings → insert en `paper_chunks`
- UI de progreso con polling al status del paper

### Días 5–6: LLM Analysis (Startup Scorecard)
- Prompt engineering para scorecard estructurado (JSON mode)
- Endpoint `POST /papers/{id}/analyze`
- Componente `StartupScorecard.tsx` con visualización
- Pantalla de paper individual completa

### Días 7–8: Library + Paper Cards
- Grid de papers con filtros por score y fecha
- Cálculo de conexiones entre papers (cosine similarity via pgvector)
- Populate tabla `paper_connections`

### Días 9–10: Research Graph + Demo
- Componente `ResearchGraph.tsx` con D3 force-directed
- Seed de 5–10 papers públicos de PubMed/bioRxiv para demo en vivo
- Polish UI: animaciones Framer Motion, estados vacíos, error handling
- Dominio custom o URL limpia en Vercel
- README con arquitectura, screenshots, y demo GIF

---

## 9. Costos operativos (MVP)

| Servicio | Tier | Costo |
|---|---|---|
| Vercel | Hobby | **$0/mes** |
| Railway | Starter | **$0/mes** (500h free) |
| Supabase | Free | **$0/mes** (500MB DB, 1GB Storage) |
| OpenAI API | Pay-per-use | ~**$2–5/mes** en uso demo |
| **Total** | | **~$2–5/mes** |

---

## 10. Narrativa de portfolio

> *"SciLens transforms scientific papers into strategic intelligence. Upload a PDF, get a Startup Potential Score, market opportunity analysis, regulatory risk assessment, and a visual map of how your research connects to the field — powered by GPT-4o and semantic search over pgvector."*

**CV entry:**
```
SciLens — AI Scientific Intelligence Platform
SaaS web platform for automated scientific paper analysis using generative AI
and RAG pipelines. Transforms academic research into structured business intelligence.

Stack: Python · FastAPI · Next.js 14 · TypeScript · Supabase (pgvector) · 
       OpenAI API · D3.js · Vercel · Railway · Docker

Highlights:
- End-to-end RAG pipeline: PDF ingestion → chunking → embeddings → semantic search
- Structured LLM output: TRL scoring, TAM estimation, regulatory complexity analysis
- Interactive force-directed graph of semantic paper connections
- Multi-tenant SaaS with Supabase RLS and magic link auth
- Fully deployed: Vercel (frontend) + Railway (API) + Supabase Cloud
```

---

*Informe generado: Mayo 2026 — para uso en portfolio y brief técnico de demo Vercel*
