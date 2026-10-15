CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE thoughts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title        TEXT,
    content      TEXT NOT NULL,
    source       TEXT NOT NULL DEFAULT 'api',
    source_ref   TEXT,
    metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
    content_hash TEXT NOT NULL UNIQUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX thoughts_created_at_idx ON thoughts (created_at DESC);

CREATE TABLE chunks (
    id         BIGSERIAL PRIMARY KEY,
    thought_id UUID NOT NULL REFERENCES thoughts(id) ON DELETE CASCADE,
    idx        INT NOT NULL,
    content    TEXT NOT NULL,
    -- Dimension is fixed at migration time; switching to a model with a different size needs a new migration.
    embedding  vector({{EMBEDDING_DIM}}),
    tsv        tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,
    UNIQUE (thought_id, idx)
);

CREATE INDEX chunks_embedding_idx ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX chunks_tsv_idx ON chunks USING gin (tsv);