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
  purpose: z.string().min(1),
  architecture: z.string().min(1),
  technologies: z.array(z.string()).max(20),
  relationships: z.array(z.string()).max(10),
  evidence: z
    .array(
      z.object({
        source: z.string(),
        quote: z.string(),
      }),
    )
    .max(10),
});

export type AnalystReport = z.infer<typeof analystReport>;

export const curatorClassification = z.object({
  classification: z.enum(["UNCHANGED", "UPDATED_PROJECT", "NEW_PROJECT", "IGNORE"]),
  projectSlug: z.string().nullable(),
  reason: z.string(),
  followupQuestion: z.string().nullable(),
});

export type CuratorClassification = z.infer<typeof curatorClassification>;
