from mcp.server.mcpserver import MCPServer

from . import capture, retrieval

mcp = MCPServer("exokortex")


@mcp.tool()
def ask(question: str, limit: int = 6) -> str:
    """Answer a question from the user's own notes, with numbered citations."""
    result = retrieval.ask(question, limit)
    if not result.sources:
        return result.answer
    return f"{result.answer}\n\nSources:\n{retrieval.format_sources(result.sources)}"


@mcp.tool()
def search_thoughts(query: str, limit: int = 8) -> str:
    """Search the user's notes (semantic + keyword) and return the best matching passages."""
    hits = retrieval.search(query, limit)
    if not hits:
        return "No matching notes."
    return "\n\n".join(
        f"[{i}] {hit.title or 'Untitled'} ({hit.source}) id={hit.thought_id}\n{hit.chunk}"
        for i, hit in enumerate(hits, 1)
    )


@mcp.tool()
def capture_thought(content: str, title: str | None = None) -> str:
    """Save a new note into the knowledge base."""
    result = capture.capture(content, title=title, source="mcp")
    if result.deduplicated:
        return f"Already captured as {result.thought_id}."
    embedded = "embedded" if result.embedded else "stored without embeddings"
    return f"Captured {result.thought_id} ({result.chunks} chunks, {embedded})."


def main() -> None:
    mcp.run()