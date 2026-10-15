import argparse
import sys
from pathlib import Path

from . import capture, db, llm, retrieval


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="exokortex", description="Personal knowledge engine.")
    sub = parser.add_subparsers(dest="command", required=True)

    migrate = sub.add_parser("migrate", help="Apply database migrations")
    migrate.add_argument("direction", choices=["up"])

    serve = sub.add_parser("serve", help="Run the HTTP API")
    serve.add_argument("--host", default="127.0.0.1")
    serve.add_argument("--port", type=int, default=8000)

    sub.add_parser("mcp", help="Run the MCP server over stdio")

    cap = sub.add_parser("capture", help="Capture a text/Markdown file, or - for stdin")
    cap.add_argument("path")
    cap.add_argument("--title")
    cap.add_argument("--source", default="cli")

    search = sub.add_parser("search", help="Search your notes")
    search.add_argument("query")
    search.add_argument("--limit", type=int, default=8)

    ask = sub.add_parser("ask", help="Ask a question answered from your notes")
    ask.add_argument("question")
    ask.add_argument("--limit", type=int, default=6)

    sub.add_parser("reembed", help="Embed chunks that were stored without embeddings")

    args = parser.parse_args(argv)
    try:
        return _run(args)
    except (llm.LLMNotConfigured, llm.LLMError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


def _run(args: argparse.Namespace) -> int:
    if args.command == "migrate":
        applied = db.migrate_up()
        print("\n".join(f"applied {name}" for name in applied) or "database is up to date")
    elif args.command == "serve":
        import uvicorn

        uvicorn.run("exokortex.api:app", host=args.host, port=args.port)
    elif args.command == "mcp":
        from .mcp_server import main as run_mcp

        run_mcp()
    elif args.command == "capture":
        if args.path == "-":
            content, title, ref = sys.stdin.read(), args.title, None
        else:
            path = Path(args.path)
            content, title, ref = path.read_text(encoding="utf-8"), args.title or path.stem, str(path.resolve())
        result = capture.capture(content, title=title, source=args.source, source_ref=ref)
        if result.deduplicated:
            print(f"already captured: {result.thought_id}")
        else:
            embedded = "embedded" if result.embedded else "no embeddings (key not set)"
            print(f"captured {result.thought_id}: {result.chunks} chunks, {embedded}")
    elif args.command == "search":
        hits = retrieval.search(args.query, args.limit)
        if not hits:
            print("no matches")
        for i, hit in enumerate(hits, 1):
            print(f"[{i}] {hit.title or 'Untitled'} ({hit.source}) score={hit.score}\n    {hit.chunk[:200]}")
    elif args.command == "ask":
        result = retrieval.ask(args.question, args.limit)
        print(result.answer)
        if result.sources:
            print(f"\nSources:\n{retrieval.format_sources(result.sources)}")
    elif args.command == "reembed":
        print(f"embedded {capture.reembed()} chunks")
    return 0