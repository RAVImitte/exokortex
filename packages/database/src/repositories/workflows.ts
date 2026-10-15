import { assertTransition, type WorkflowState } from "@exokortex/core";
import { newId, nowIso } from "@exokortex/shared";
import { toWorkflow, type WorkflowRow } from "../rows.js";
import type { WorkflowRecord } from "../types.js";
import { AuditRepository, type AuditInput } from "./audit.js";

export class WorkflowRepository {
  private readonly audit: AuditRepository;

  constructor(private readonly db: D1Database) {
    this.audit = new AuditRepository(db);
  }

  async create(userId: string, state: WorkflowState, now = nowIso()): Promise<WorkflowRecord> {
    const id = newId();
    await this.db
      .prepare(
        "INSERT INTO workflows (id, user_id, state, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      )
      .bind(id, userId, state, now, now)
      .run();
    await this.audit.write({
      userId,
      workflowId: id,
      entityType: "workflow",
      entityId: id,
      fromState: null,
      toState: state,
      now,
    });
    return { id, userId, state };
  }

  async transition(
    userId: string,
    workflowId: string,
    to: WorkflowState,
    now = nowIso(),
  ): Promise<WorkflowRecord> {
    const current = await this.db
      .prepare("SELECT * FROM workflows WHERE id = ? AND user_id = ?")
      .bind(workflowId, userId)
      .first<WorkflowRow>();
    if (!current) throw new Error("workflow not found");
    const from = toWorkflow(current).state;
    assertTransition(from, to);
    await this.db
      .prepare("UPDATE workflows SET state = ?, updated_at = ? WHERE id = ? AND user_id = ?")
      .bind(to, now, workflowId, userId)
      .run();
    await this.audit.write({
      userId,
      workflowId,
      entityType: "workflow",
      entityId: workflowId,
      fromState: from,
      toState: to,
      now,
    });
    return { id: workflowId, userId, state: to };
  }
}

export type { AuditInput };
