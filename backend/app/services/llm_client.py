"""
Central LLM client factory — provider-agnostic.

OpenRouter, Ollama, and any OpenAI-compatible server are reached through the
same AsyncOpenAI client; only base_url / api_key / model differ. Switch the
whole app between providers via env (.env locally, Fly secrets in prod) — no
code change:

    # OpenRouter (cloud, default — free models)
    LLM_BASE_URL=https://openrouter.ai/api/v1
    LLM_API_KEY=sk-or-v1-...
    LLM_MODEL=qwen/qwen3-next-80b-a3b-instruct:free

    # Ollama (local) — run `ollama serve`, then:
    LLM_BASE_URL=http://localhost:11434/v1
    LLM_API_KEY=ollama            # ignored by Ollama, but the SDK needs a value
    LLM_MODEL=qwen3:8b
    LLM_MODEL_FALLBACK=llama3.2:3b

Note: a local Ollama is only reachable when the backend itself runs locally —
the Fly.io deployment cannot reach your machine's localhost.
"""
from __future__ import annotations
from openai import AsyncOpenAI
from app.config import settings


def make_llm_client(timeout: float) -> AsyncOpenAI:
    """Build an OpenAI-compatible async client from the configured provider."""
    return AsyncOpenAI(
        # Ollama ignores the key but the SDK requires a non-empty value.
        api_key=settings.llm_api_key or settings.openrouter_api_key or "ollama",
        base_url=settings.llm_base_url,
        timeout=timeout,
        default_headers={"HTTP-Referer": "https://scilens.app", "X-Title": "SciLens"},
    )
