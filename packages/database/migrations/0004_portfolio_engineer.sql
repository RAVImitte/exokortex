CREATE TABLE portfolio_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  framework TEXT NOT NULL,
  project_data_path TEXT NOT NULL,
  test_command TEXT NOT NULL,
  build_command TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (repository_id)
);

ALTER TABLE approvals ADD COLUMN pull_request_url TEXT;
