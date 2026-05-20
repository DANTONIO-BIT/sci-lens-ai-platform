from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # OpenRouter — https://openrouter.ai/keys
    openrouter_api_key: str
    # Free models: "meta-llama/llama-3.3-70b-instruct:free"
    #              "google/gemini-2.0-flash-001"
    #              "mistralai/mistral-small-3.1-24b-instruct:free"
    llm_model: str = "meta-llama/llama-3.3-70b-instruct:free"

    # Jina AI — https://jina.ai  (1M tokens/month gratis)
    jina_api_key: str
    embedding_model: str = "jina-embeddings-v3"
    embedding_dimensions: int = 1024   # debe coincidir con el schema SQL

    # Supabase — usar service_role key (NO la anon key)
    supabase_url: str
    supabase_service_role_key: str

    # CORS — URL del frontend
    frontend_url: str = "http://localhost:3000"

    # Límites de procesamiento
    chunk_size: int = 500
    chunk_overlap: int = 50
    max_file_size_mb: int = 50


settings = Settings()  # type: ignore[call-arg]
