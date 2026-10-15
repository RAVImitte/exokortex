from exokortex import llm
from exokortex.config import ANTHROPIC_BASE_URL, OPENAI_BASE_URL, Settings


def make(**overrides) -> Settings:
    return Settings(_env_file=None, **overrides)


def test_openai_key_is_reused_for_embeddings():
    s = make(llm_api_key="sk-test", llm_base_url="https://openrouter.ai/api/v1/")
    assert s.resolved_embedding_api_key == "sk-test"
    assert s.resolved_embedding_base_url == "https://openrouter.ai/api/v1"


def test_anthropic_key_is_not_reused_for_embeddings():
    s = make(llm_provider="anthropic", llm_api_key="sk-ant")
    assert s.resolved_llm_base_url == ANTHROPIC_BASE_URL
    assert s.resolved_embedding_api_key is None
    assert s.resolved_embedding_base_url == OPENAI_BASE_URL


def test_chat_needs_key_and_model():
    assert not llm.chat_configured(make(llm_api_key="sk-test"))
    assert llm.chat_configured(make(llm_api_key="sk-test", llm_model="some-model"))


def test_embed_without_key_raises_not_configured():
    try:
        llm.embed(["hi"], make())
    except llm.LLMNotConfigured:
        return
    raise AssertionError("expected LLMNotConfigured")