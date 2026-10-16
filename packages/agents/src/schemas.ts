import { z } from "zod";

export const scoutReport = z.object({
  meaningful: z.boolean(),
  significance: z.enum(["noise", "low", "high"]),
  summary: z.string().min(1),
  evidence: z
    .array(
      z.object({
        path: z.string(),
        status: z.string(),
        note: z.string(),
      }),
    )
    .max(30),
});

export type ScoutReport = z.infer<typeof scoutReport>;

export const analystReport = z.object({
  purpose: z.string().min(1).catch("Not stated."),
  architecture: z.string().min(1).catch("Not stated."),
  technologies: z.array(z.string()).max(20).catch([]),
  relationships: z.array(z.string()).max(10).catch([]),
  evidence: z
    .array(
      z.object({
        source: z.string(),
        quote: z.string(),
      }),
    )
    .max(10)
    .catch([]),
});

export type AnalystReport = z.infer<typeof analystReport>;

export const followupAnswer = z.object({
  answer: z.string().min(1).catch("No further evidence."),
});

export type FollowupAnswer = z.infer<typeof followupAnswer>;

export const curatorClassification = z.object({
  classification: z.enum(["UNCHANGED", "UPDATED_PROJECT", "NEW_PROJECT", "IGNORE"]),
  projectSlug: z.string().nullable().catch(null),
  reason: z.string().min(1).catch("No reason stated."),
  followupQuestion: z.string().nullable().catch(null),
});

export type CuratorClassification = z.infer<typeof curatorClassification>;

export function engineerChange(projectDataPath: string) {
  return z.object({
    path: z.literal(projectDataPath),
    content: z.string().min(1).max(100_000),
    commitMessage: z.string().min(1).max(200),
    prTitle: z.string().min(1).max(120),
    prBody: z.string().max(4_000),
  });
}

export type EngineerChange = z.infer<ReturnType<typeof engineerChange>>;
