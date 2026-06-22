from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── LLM provider (OpenAI-compatible: OpenRouter, Ollama, …) ──
    # Switch providers entirely via env — no code change. Examples:
    #   OpenRouter (cloud): LLM_BASE_URL=https://openrouter.ai/api/v1
    #   Ollama (local):     LLM_BASE_URL=http://localhost:11434/v1
    llm_base_url: str = "https://openrouter.ai/api/v1"
    llm_api_key: str = ""          # if empty, falls back to openrouter_api_key
    openrouter_api_key: str = ""   # back-compat; used as the key when llm_api_key is unset
    # NOTE: free OpenRouter models get deprecated/rotated often. If analysis
    # starts timing out, verify both IDs still exist:
    #   GET https://openrouter.ai/api/v1/models
    # In production these are set as Fly secrets (LLM_MODEL / LLM_MODEL_FALLBACK),
    # which OVERRIDE the defaults below — update the secrets too, not just this file.
    llm_model: str = "qwen/qwen3-next-80b-a3b-instruct:free"
    llm_model_fallback: str = "meta-llama/llama-3.3-70b-instruct:free"

    # Jina AI — https://jina.ai (1M tokens/month free)
    jina_api_key: str
    embedding_model: str = "jina-embeddings-v3"
    embedding_dimensions: int = 1024

    # Supabase — service_role key required
    supabase_url: str
    supabase_service_role_key: str

    # CORS
    frontend_url: str = "http://localhost:3000"

    # Scientific enrichment APIs (all free — keys increase rate limits only)
    ncbi_api_key: str = ""      # https://www.ncbi.nlm.nih.gov/account/
    openfda_api_key: str = ""   # https://open.fda.gov/apis/authentication/

    # Processing limits
    chunk_size: int = 500
    chunk_overlap: int = 50
    max_file_size_mb: int = 50


settings = Settings()  # type: ignore[call-arg]
