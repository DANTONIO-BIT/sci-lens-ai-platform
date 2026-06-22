from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # OpenRouter — free models only.
    # NOTE: free models get deprecated/rotated often. If analysis starts timing
    # out, verify both IDs still exist: GET https://openrouter.ai/api/v1/models
    # These defaults are also mirrored as Fly secrets (LLM_MODEL / LLM_MODEL_FALLBACK),
    # which OVERRIDE them in production — update the secrets too, not just this file.
    openrouter_api_key: str
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
