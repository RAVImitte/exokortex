from dataclasses import dataclass, field
from datetime import datetime

import numpy as np

from . import db, llm
from .config import Settings, get_settings

RRF_K = 60

SYSTEM_PROMPT = """You answer questions using only the user's own notes, given below as numbered sources.
Cite the sources you rely on inline as [n]. If the sources don't contain the answer, say so plainly instead of guessing."""

_HIT_COLUMNS = (
    "c.id AS chunk_id, c.content AS chunk, t.id AS thought_id, "
    "t.title, t.source, t.source_ref, t.created_at"
)


@dataclass
class Hit:
    thought_id: str
    title: str | None
    source: str
    source_ref: str | None
    chunk: str
    created_at: datetime
    score: float


@dataclass
class Answer:
    answer: str
    sources: list[Hit] = field(default_factory=list)


def fuse(*rankings: list) -> list[tuple[object, float]]:
    """Reciprocal rank fusion: merge ranked id lists into one list of (id, score), best first."""
    scores: dict[object, float] = {}
    for ranking in rankings:
        for rank, key in enumerate(ranking):
            scores[key] = scores.get(key, 0.0) + 1.0 / (RRF_K + rank + 1)
    return sorted(scores.items(), key=lambda item: item[1], reverse=True)


def search(query: str, limit: int = 8, settings: Settings | None = None) -> list[Hit]:
    s = settings or get_settings()
    query = query.strip()
    if not query:
        return []
    candidates = max(limit * 4, 20)

    try:
        query_vector = np.array(llm.embed([query], s)[0], dtype=np.float32)
    except llm.LLMNotConfigured:
        query_vector = None

    rows_by_id: dict[int, dict] = {}
    rankings: list[list[int]] = []
    with db.connect(s) as conn:
        if query_vector is not None:
            rows = conn.execute(
                f"SELECT {_HIT_COLUMNS} FROM chunks c JOIN thoughts t ON t.id = c.thought_id "
                "WHERE c.embedding IS NOT NULL ORDER BY c.embedding <=> %s LIMIT %s",
                (query_vector, candidates),
            ).fetchall()
            rankings.append([r["chunk_id"] for r in rows])
            rows_by_id.update((r["chunk_id"], r) for r in rows)

        rows = conn.execute(
            f"SELECT {_HIT_COLUMNS} FROM chunks c JOIN thoughts t ON t.id = c.thought_id "
            "CROSS JOIN websearch_to_tsquery('simple', %s) q "
            "WHERE c.tsv @@ q ORDER BY ts_rank(c.tsv, q) DESC LIMIT %s",
            (query, candidates),
        ).fetchall()
        rankings.append([r["chunk_id"] for r in rows])
        rows_by_id.update((r["chunk_id"], r) for r in rows)

    return [
        Hit(
            thought_id=str(row["thought_id"]),
            title=row["title"],
            source=row["source"],
            source_ref=row["source_ref"],
            chunk=row["chunk"],
            created_at=row["created_at"],
            score=round(score, 5),
        )
        for chunk_id, score in fuse(*rankings)[:limit]
        for row in [rows_by_id[chunk_id]]
    ]


def ask(question: str, limit: int = 6, settings: Settings | None = None) -> Answer:
    s = settings or get_settings()
    if not llm.chat_configured(s):
        raise llm.LLMNotConfigured("Answers are off. Set EXOKORTEX_LLM_API_KEY and EXOKORTEX_LLM_MODEL.")

    hits = search(question, limit, s)
    if not hits:
        return Answer("Nothing in your notes matches that question yet.")

    context = "\n\n".join(
        f"[{i}] {hit.title or 'Untitled'} ({hit.source})\n{hit.chunk}" for i, hit in enumerate(hits, 1)
    )
    text = llm.chat(SYSTEM_PROMPT, f"Sources:\n\n{context}\n\nQuestion: {question}", s)
    return Answer(text, hits)


def format_sources(hits: list[Hit]) -> str:
    lines = []
    for i, hit in enumerate(hits, 1):
        where = f" - {hit.source_ref}" if hit.source_ref else ""
        lines.append(f"[{i}] {hit.title or 'Untitled'} ({hit.source}{where}) id={hit.thought_id}")
    return "\n".join(lines)