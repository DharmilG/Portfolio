// lib/validators.ts — query validation for API routes.
// See DOC/09 §0 (conventions) and §4 (commits pagination).
import { z } from "zod";

const ownerName = z.string().regex(/^[a-zA-Z0-9_.-]+$/, "invalid owner/repo");

export const RepoQuery = z.object({
  owner: ownerName,
  repo: ownerName,
  branch: z
    .string()
    .regex(/^[a-zA-Z0-9_.\/-]+$/, "invalid branch")
    .optional(),
});

export const CommitsQuery = RepoQuery.extend({
  // 16 per page is the Source Control page size (DOC/09 §4).
  per_page: z.coerce.number().min(1).max(32).default(16),
  page: z.coerce.number().min(1).max(20).default(1),
});

export const BlobQuery = RepoQuery.extend({
  sha: z.string().regex(/^[a-f0-9]{40}$/, "invalid sha"),
  path: z
    .string()
    .max(1024)
    .refine((p) => !p.includes(".."), "path traversal"),
});
