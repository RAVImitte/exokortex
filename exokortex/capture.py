import hashlib
import re
from dataclasses import dataclass

import numpy as np
from psycopg.types.json import Jsonb

from . import db, llm
from .config import Settings, get_settings


@dataclass
class CaptureResult:
    thought_id: str
    chunks: int
    embedded: bool
    deduplicated: bool


def chunk_text(text: str, max_chars: int) -> list[str]:
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks: list[str] = []
    current = ""
    for paragraph in paragraphs:
        while len(paragraph) > max_chars:
            if current:
                chunks.append(current)
                current = ""
            chunks.append(paragraph[:max_chars])
            paragraph = paragraph[max_chars:].lstrip()
        if not paragraph:
            continue
        if current and len(current) + 2 + len(paragraph) > max_chars:
            chunks.append(current)
            current = paragraph
        else:
            current = f"{current}\n\n{paragraph}" if current else paragraph
    if current:
        chunks.append(current)
    return chunks


def capture(
    content: str,
    *,
    title: str | None = None,
    source: str = "api",
    source_ref: str | None = None,
    metadata: dict | None = None,
    settings: Settings | None = None,
) -> CaptureResult:
    s = settings or get_settings()
    content = content.strip()
    if not content:
        raise ValueError("content is empty")
    content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()

    existing = _find_by_hash(content_hash, s)
    if existing:
        return CaptureResult(existing, chunks=0, embedded=False, deduplicated=True)

    chunks = chunk_text(content, s.chunk_chars)
    try:
        vectors = [np.array(v, dtype=np.float32) for v in llm.embed(chunks, s)]
    except llm.LLMNotConfigured:
        vectors = [None] * len(chunks)

    with db.connect(s) as conn:
        row = conn.execute(
            "INSERT INTO thoughts (title, content, source, source_ref, metadata, content_hash) "
            "VALUES (%s, %s, %s, %s, %s, %s) ON CONFLICT (content_hash) DO NOTHING RETURNING id",
            (title, content, source, source_ref, Jsonb(metadata or {}), content_hash),
        ).fetchone()
        if row is None:
            return CaptureResult(_find_by_hash(content_hash, s), chunks=0, embedded=False, deduplicated=True)
        with conn.cursor() as cur:
            cur.executemany(
                "INSERT INTO chunks (thought_id, idx, content, embedding) VALUES (%s, %s, %s, %s)",
                [(row["id"], i, chunk, vector) for i, (chunk, vector) in enumerate(zip(chunks, vectors))],
            )

    return CaptureResult(str(row["id"]), chunks=len(chunks), embedded=vectors[0] is not None, deduplicated=False)


def reembed(batch_size: int = 64, settings: Settings | None = None) -> int:
    s = settings or get_settings()
    total = 0
    while True:
        with db.connect(s) as conn:
            rows = conn.execute(
                "SELECT id, content FROM chunks WHERE embedding IS NULL ORDER BY id LIMIT %s", (batch_size,)
            ).fetchall()
            if not rows:
                return total
            vectors = llm.embed([r["content"] for r in rows], s)
            with conn.cursor() as cur:
                cur.executemany(
                    "UPDATE chunks SET embedding = %s WHERE id = %s",
                    [(np.array(v, dtype=np.float32), r["id"]) for v, r in zip(vectors, rows)],
                )
        total += len(rows)


def get_thought(thought_id: str, settings: Settings | None = None) -> dict | None:
    with db.connect(settings) as conn:
        return conn.execute(
            "SELECT id, title, content, source, source_ref, metadata, created_at FROM thoughts WHERE id = %s",
            (thought_id,),
        ).fetchone()


def _find_by_hash(content_hash: str, settings: Settings) -> str | None:
    with db.connect(settings) as conn:
        row = conn.execute("SELECT id FROM thoughts WHERE content_hash = %s", (content_hash,)).fetchone()
    return str(row["id"]) if row else None