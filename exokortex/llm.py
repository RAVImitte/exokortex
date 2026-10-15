import httpx

from .config import Settings, get_settings

EMBED_BATCH = 64


class LLMNotConfigured(RuntimeError):
    pass


class LLMError(RuntimeError):
    pass


def embeddings_configured(settings: Settings) -> bool:
    return bool(settings.resolved_embedding_api_key)


def chat_configured(settings: Settings) -> bool:
    return bool(settings.llm_api_key and settings.llm_model)


def embed(texts: list[str], settings: Settings | None = None) -> list[list[float]]:
    s = settings or get_settings()
    key = s.resolved_embedding_api_key
    if not key:
        raise LLMNotConfigured(
            "Embeddings are off. Set EXOKORTEX_EMBEDDING_API_KEY "
            "(or EXOKORTEX_LLM_API_KEY with the openai provider)."
        )

    vectors: list[list[float]] = []
    for start in range(0, len(texts), EMBED_BATCH):
        data = _post(
            f"{s.resolved_embedding_base_url}/embeddings",
            headers={"Authorization": f"Bearer {key}"},
            payload={"model": s.embedding_model, "input": texts[start : start + EMBED_BATCH]},
        )
        items = sorted(data["data"], key=lambda item: item["index"])
        vectors.extend(item["embedding"] for item in items)

    for vector in vectors:
        if len(vector) != s.embedding_dim:
            raise LLMError(
                f"{s.embedding_model} returned {len(vector)} dimensions, "
                f"but EXOKORTEX_EMBEDDING_DIM is {s.embedding_dim}."
            )
    return vectors


def chat(system: str, user: str, settings: Settings | None = None) -> str:
    s = settings or get_settings()
    if not chat_configured(s):
        raise LLMNotConfigured("Answers are off. Set EXOKORTEX_LLM_API_KEY and EXOKORTEX_LLM_MODEL.")

    base = s.resolved_llm_base_url
    if s.llm_provider == "anthropic":
        data = _post(
            f"{base}/v1/messages",
            headers={"x-api-key": s.llm_api_key, "anthropic-version": "2023-06-01"},
            payload={
                "model": s.llm_model,
                "max_tokens": 1024,
                "system": system,
                "messages": [{"role": "user", "content": user}],
            },
        )
        return "".join(b.get("text", "") for b in data["content"] if b.get("type") == "text").strip()

    data = _post(
        f"{base}/chat/completions",
        headers={"Authorization": f"Bearer {s.llm_api_key}"},
        payload={
            "model": s.llm_model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        },
    )
    return (data["choices"][0]["message"]["content"] or "").strip()


def _post(url: str, headers: dict, payload: dict) -> dict:
    try:
        response = httpx.post(url, headers=headers, json=payload, timeout=120)
    except httpx.HTTPError as exc:
        raise LLMError(f"Could not reach {url}: {exc}") from exc
    if response.status_code >= 400:
        raise LLMError(f"{url} returned {response.status_code}: {response.text[:500]}")
    return response.json()