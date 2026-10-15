export const WORKFLOW_STATES = [
  "SCAN_PENDING",
  "SCANNING",
  "SCOUTING",
  "ANALYZING",
  "CURATING",
  "PENDING_APPROVAL",
  "ENGINEERING",
  "VALIDATING",
  "WAITING_FOR_CI",
  "VERIFYING",
  "COMPLETED",
  "FAILED",
] as const;

export type WorkflowState = (typeof WORKFLOW_STATES)[number];

const TRANSITIONS: Record<WorkflowState, readonly WorkflowState[]> = {
  SCAN_PENDING: ["SCANNING", "FAILED"],
  SCANNING: ["SCOUTING", "COMPLETED", "FAILED"],
  SCOUTING: ["ANALYZING", "FAILED"],
  ANALYZING: ["CURATING", "COMPLETED", "FAILED"],
  CURATING: ["PENDING_APPROVAL", "ENGINEERING", "COMPLETED", "FAILED"],
  PENDING_APPROVAL: ["ENGINEERING", "COMPLETED", "FAILED"],
  ENGINEERING: ["VALIDATING", "FAILED"],
  VALIDATING: ["WAITING_FOR_CI", "FAILED"],
  WAITING_FOR_CI: ["VERIFYING", "FAILED"],
  VERIFYING: ["COMPLETED", "FAILED"],
  COMPLETED: [],
  FAILED: [],
};

export function canTransition(from: WorkflowState, to: WorkflowState): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: WorkflowState, to: WorkflowState): WorkflowState {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal workflow transition: ${from} -> ${to}`);
  }
  return to;
}
