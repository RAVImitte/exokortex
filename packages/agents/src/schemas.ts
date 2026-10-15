import { z } from "zod";

export const curatorClassification = z.object({
  classification: z.enum(["UNCHANGED", "UPDATED_PROJECT", "NEW_PROJECT", "IGNORE"]),
  projectSlug: z.string().nullable(),
  reason: z.string(),
  followupQuestion: z.string().nullable(),
});

export type CuratorClassification = z.infer<typeof curatorClassification>;
