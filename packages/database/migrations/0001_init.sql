CREATE TABLE users (
  id TEXT PRIMARY KEY,
  auth_subject TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  status TEXT NOT NULL DEFAULT 'active',
  scan_frequency TEXT NOT NULL DEFAULT 'weekly',
  next_scan_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE llm_configs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  base_url TEXT NOT NULL,
  model TEXT NOT NULL,
  encrypted_api_key TEXT NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (user_id)
);

CREATE TABLE connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_user_id TEXT,
  external_installation_id TEXT,
  encrypted_credentials TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX connections_installation_idx ON connections (provider, external_installation_id);

CREATE TABLE repositories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connection_id TEXT NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  default_branch TEXT,
  role TEXT NOT NULL DEFAULT 'SOURCE',
  last_revision TEXT,
  last_scanned_at TEXT,
  excluded INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (user_id, connection_id, external_id)
);

CREATE INDEX repositories_user_idx ON repositories (user_id);

CREATE TABLE portfolio_projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  technologies_json TEXT NOT NULL DEFAULT '[]',
  links_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (user_id, slug)
);

CREATE TABLE project_sources (
  project_id TEXT NOT NULL REFERENCES portfolio_projects(id) ON DELETE CASCADE,
  repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, repository_id)
);

CREATE TABLE workflows (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE change_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repository_id TEXT NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  from_revision TEXT NOT NULL,
  to_revision TEXT NOT NULL,
  type TEXT NOT NULL,
  significance TEXT,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  processed_at TEXT,
  UNIQUE (repository_id, from_revision, to_revision)
);

CREATE INDEX change_events_user_idx ON change_events (user_id, created_at);

CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workflow_id TEXT REFERENCES workflows(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  idempotency_key TEXT NOT NULL UNIQUE,
  next_run_at TEXT,
  locked_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX jobs_due_idx ON jobs (status, next_run_at);

CREATE TABLE approvals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES portfolio_projects(id) ON DELETE SET NULL,
  change_event_id TEXT REFERENCES change_events(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE TABLE agent_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  input_reference TEXT,
  output_reference TEXT,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  started_at TEXT,
  completed_at TEXT,
  error TEXT
);

CREATE TABLE deployments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  portfolio_project_id TEXT REFERENCES portfolio_projects(id) ON DELETE SET NULL,
  commit_sha TEXT,
  status TEXT NOT NULL,
  deployment_url TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workflow_id TEXT,
  job_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX audit_events_user_idx ON audit_events (user_id, created_at);
