from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import papers, graph

app = FastAPI(
    title="SciLens API",
    description="AI-powered scientific paper analysis platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(papers.router)
app.include_router(graph.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "scilens-api"}
