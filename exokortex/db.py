from collections.abc import Iterator
from contextlib import contextmanager
from importlib import resources

import psycopg
from pgvector.psycopg import register_vector
from psycopg.rows import dict_row

from .config import Settings, get_settings


@contextmanager
def connect(settings: Settings | None = None) -> Iterator[psycopg.Connection]:
    s = settings or get_settings()
    with psycopg.connect(s.database_url, row_factory=dict_row) as conn:
        register_vector(conn)
        yield conn


def migrate_up(settings: Settings | None = None) -> list[str]:
    s = settings or get_settings()
    migrations = sorted(
        (f for f in resources.files("exokortex").joinpath("migrations").iterdir() if f.name.endswith(".sql")),
        key=lambda f: f.name,
    )
    applied: list[str] = []
    with psycopg.connect(s.database_url, autocommit=True) as conn:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_migrations ("
            "name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())"
        )
        done = {row[0] for row in conn.execute("SELECT name FROM schema_migrations")}
        for migration in migrations:
            if migration.name in done:
                continue
            sql = migration.read_text(encoding="utf-8").replace("{{EMBEDDING_DIM}}", str(s.embedding_dim))
            with conn.transaction():
                conn.execute(sql)
                conn.execute("INSERT INTO schema_migrations (name) VALUES (%s)", (migration.name,))
            applied.append(migration.name)
    return applied