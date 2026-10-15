from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

OPENAI_BASE_URL = "https://api.openai.com/v1"
ANTHROPIC_BASE_URL = "https://api.anthropic.com"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="EXOKORTEX_", env_file=".env", extra="ignore")

    database_url: str = "postgresql://exokortex:exokortex@localhost:5433/exokortex"
    api_token: str | None = None

    llm_provider: Literal["openai", "anthropic"] = "openai"
    llm_api_key: str | None = None
    llm_base_url: str | None = None
    llm_model: str | None = None

    embedding_api_key: str | None = None
    embedding_base_url: str | None = None
    embedding_model: str = "text-embedding-3-small"
    embedding_dim: int = 1536

    chunk_chars: int = 1500

    @property
    def resolved_llm_base_url(self) -> str:
        if self.llm_base_url:
            return self.llm_base_url.rstrip("/")
        return ANTHROPIC_BASE_URL if self.llm_provider == "anthropic" else OPENAI_BASE_URL

    @property
    def resolved_embedding_api_key(self) -> str | None:
        if self.embedding_api_key:
            return self.embedding_api_key
        # Anthropic has no embeddings endpoint, so its key can't be reused here.
        return self.llm_api_key if self.llm_provider == "openai" else None

    @property
    def resolved_embedding_base_url(self) -> str:
        if self.embedding_base_url:
            return self.embedding_base_url.rstrip("/")
        if self.llm_provider == "openai" and self.llm_base_url:
            return self.llm_base_url.rstrip("/")
        return OPENAI_BASE_URL


@lru_cache
def get_settings() -> Settings:
    return Settings()