import { AuditRepository } from "./repositories/audit.js";
import { ChangeEventRepository } from "./repositories/changes.js";
import { ConnectionRepository } from "./repositories/connections.js";
import { DashboardRepository } from "./repositories/dashboard.js";
import { JobRepository } from "./repositories/jobs.js";
import { LlmConfigRepository } from "./repositories/llm-configs.js";
import { TrackedRepositoryRepository } from "./repositories/repositories.js";
import { UserRepository } from "./repositories/users.js";
import { WorkflowRepository } from "./repositories/workflows.js";

export class Database {
  readonly users: UserRepository;
  readonly connections: ConnectionRepository;
  readonly repos: TrackedRepositoryRepository;
  readonly changes: ChangeEventRepository;
  readonly jobs: JobRepository;
  readonly workflows: WorkflowRepository;
  readonly audit: AuditRepository;
  readonly llm: LlmConfigRepository;
  readonly dashboard: DashboardRepository;

  constructor(d1: D1Database) {
    this.users = new UserRepository(d1);
    this.connections = new ConnectionRepository(d1);
    this.repos = new TrackedRepositoryRepository(d1);
    this.changes = new ChangeEventRepository(d1);
    this.jobs = new JobRepository(d1);
    this.workflows = new WorkflowRepository(d1);
    this.audit = new AuditRepository(d1);
    this.llm = new LlmConfigRepository(d1);
    this.dashboard = new DashboardRepository(d1);
  }
}
