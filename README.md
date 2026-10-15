# Exokortex

A self-hosted personal knowledge engine. Capture notes, embed them into Postgres with pgvector, and ask questions that are answered from your own notes with numbered citations. It works over an HTTP API, a CLI, and an MCP server (Claude Desktop, Cursor, or any other MCP client).

Bring your own model: you supply the API key from your own provider account. Any OpenAI-compatible endpoint works (OpenAI, OpenRouter, Ollama, LM Studio, and others), and Anthropic is supported for answers.

## How it works

- **Capture**: a note is split into chunks on paragraph boundaries, deduplicated by content hash, and embedded if an embedding key is set.
- **Search**: hybrid retrieval that fuses vector similarity with Postgres full-text search (reciprocal rank fusion). Without an embedding key it falls back to keyword search only.
- **Ask**: the best passages are sent to your chat model, which answers only from them and cites them as `[n]`.

## Quick start (Docker)

```powershell
copy .env.example .env      # fill in your provider key and model
docker compose up -d --build
```

The API container applies migrations on start and listens on http://localhost:8000. Interactive docs are at http://localhost:8000/docs.

```powershell
# Capture a note
curl -X POST http://localhost:8000/capture -H "Content-Type: application/json" `
  -d '{"title": "Cypher notes", "content": "Apache AGE runs Cypher queries inside Postgres."}'

# Search and ask
curl "http://localhost:8000/search?q=cypher"
curl -X POST http://localhost:8000/ask -H "Content-Type: application/json" -d '{"question": "What runs Cypher inside Postgres?"}'
```

The same commands are available through the CLI inside the container:

```powershell
docker compose exec api exokortex capture - --title "Idea" < note.md
docker compose exec api exokortex ask "what did I note about Cypher?"
docker compose exec api exokortex reembed   # embed notes captured before a key was set
```

## Local development

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
docker compose up -d db          # Postgres on localhost:5433
exokortex migrate up
exokortex serve
pytest
```

## MCP

Tools: `ask`, `search_thoughts`, `capture_thought`. Add this to your MCP client config (for Cursor, `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "exokortex": {
      "command": "docker",
      "args": ["compose", "-f", "D:/Chadukunta/exokortex/docker-compose.yml", "exec", "-T", "api", "exokortex", "mcp"]
    }
  }
}
```

## Configuration

All settings are `EXOKORTEX_*` environment variables; see `.env.example`.

| Variable | Purpose |
| --- | --- |
| `EXOKORTEX_LLM_PROVIDER` | `openai` (any OpenAI-compatible API) or `anthropic` |
| `EXOKORTEX_LLM_API_KEY` / `EXOKORTEX_LLM_MODEL` | Your chat key and model; both are needed for `/ask` |
| `EXOKORTEX_LLM_BASE_URL` | Custom endpoint (OpenRouter, Ollama, LM Studio, ...) |
| `EXOKORTEX_EMBEDDING_*` | Embedding key, endpoint, model, and dimension |
| `EXOKORTEX_API_TOKEN` | Optional bearer token for the HTTP API |

`EXOKORTEX_EMBEDDING_DIM` is fixed when the database is first migrated. To switch to an embedding model with a different size, reset the database (`docker compose down -v`) or add a migration.

## API

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Database status and which model features are configured |
| POST | `/capture` | Store a note: `content`, optional `title`, `source`, `source_ref`, `metadata` |
| GET | `/search?q=&limit=` | Hybrid search over captured notes |
| POST | `/ask` | `question`, optional `limit`; returns `answer` plus `sources` |
| GET | `/thoughts/{id}` | Fetch one captured note |