import { z } from "zod";
import { FREE_PLAN } from "./plans";
import type { Ballot, Selections } from "./types";

export const ABSTAIN = "abstain";

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$/, "Use 3–50 lowercase letters, numbers or hyphens");

export const RESERVED_SLUGS = new Set(["new", "admin", "api", "dashboard", "login", "signup", "e", "invite"]);

export const electionDetailsSchema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(120),
  orgName: z.string().trim().min(2, "Organization name is too short").max(120),
  description: z.string().trim().max(2000).default(""),
});

export const scheduleSchema = z
  .object({
    startsAt: z.number().int().positive(),
    endsAt: z.number().int().positive(),
    timezone: z.string().min(1).max(64),
  })
  .refine((s) => s.endsAt > s.startsAt, { message: "Voting must close after it opens", path: ["endsAt"] })
  .refine((s) => s.endsAt - s.startsAt <= 1000 * 60 * 60 * 24 * 31, {
    message: "Voting can stay open for at most 31 days",
    path: ["endsAt"],
  });

export const visibilitySchema = z.enum(["live", "afterClose", "manual", "private"]);

export const createElectionSchema = electionDetailsSchema.extend({
  slug: slugSchema,
  startsAt: z.number().int().positive(),
  endsAt: z.number().int().positive(),
  timezone: z.string().min(1).max(64),
  visibility: visibilitySchema,
});

export const ballotOptionsSchema = z.object({
  shuffle: z.boolean(),
  requireAll: z.boolean(),
});

export const brandingSchema = z.object({
  logoUrl: z.string().url().nullable(),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable(),
});

const idSchema = z.string().regex(/^[a-z0-9]{6,20}$/);

const candidateSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1, "Candidate name is required").max(100),
  bio: z.string().trim().max(2000).default(""),
  photoUrl: z.string().url().nullable(),
});

const positionSchema = z
  .object({
    id: idSchema,
    title: z.string().trim().min(1, "Position title is required").max(100),
    description: z.string().trim().max(500).default(""),
    type: z.enum(["single", "multi", "yesno"]),
    maxSelections: z.number().int().min(1).max(50),
    allowAbstain: z.boolean(),
    candidates: z.array(candidateSchema).max(FREE_PLAN.candidatesPerElection),
  })
  .superRefine((p, ctx) => {
    if (p.type === "yesno" && p.candidates.length > 1) {
      ctx.addIssue({ code: "custom", message: `"${p.title}": Yes/No positions take exactly one candidate` });
    }
    if (p.type === "multi" && p.candidates.length > 0 && p.maxSelections > p.candidates.length) {
      ctx.addIssue({ code: "custom", message: `"${p.title}": can't select more candidates than exist` });
    }
  });

export const ballotSchema = z
  .object({
    positions: z.array(positionSchema).max(FREE_PLAN.positionsPerElection, `At most ${FREE_PLAN.positionsPerElection} positions`),
  })
  .superRefine((b, ctx) => {
    const total = b.positions.reduce((n, p) => n + p.candidates.length, 0);
    if (total > FREE_PLAN.candidatesPerElection) {
      ctx.addIssue({ code: "custom", message: `At most ${FREE_PLAN.candidatesPerElection} candidates per election` });
    }
    const ids = new Set<string>();
    for (const p of b.positions) {
      for (const id of [p.id, ...p.candidates.map((c) => c.id)]) {
        if (ids.has(id)) ctx.addIssue({ code: "custom", message: "Duplicate IDs in ballot" });
        ids.add(id);
      }
    }
  })
  .transform((b) => ({
    positions: b.positions.map((p) => ({
      ...p,
      maxSelections: p.type === "multi" ? p.maxSelections : 1,
    })),
  }));

export const voterInputSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email"),
  name: z.string().trim().max(100).default(""),
});

export function ballotReadinessIssues(ballot: Ballot | null): string[] {
  const issues: string[] = [];
  if (!ballot || ballot.positions.length === 0) return ["Add at least one position"];
  for (const p of ballot.positions) {
    if (p.candidates.length === 0) issues.push(`"${p.title}" has no candidates`);
    if (p.type === "yesno" && p.candidates.length !== 1) issues.push(`"${p.title}" needs exactly one candidate`);
  }
  return issues;
}

export function validateSelections(
  ballot: Ballot,
  input: unknown,
  requireAll: boolean,
): { ok: true; selections: Selections } | { ok: false; error: string } {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, error: "Invalid ballot" };
  }
  const raw = input as Record<string, unknown>;
  const known = new Set(ballot.positions.map((p) => p.id));
  if (Object.keys(raw).some((k) => !known.has(k))) return { ok: false, error: "Ballot contains unknown positions" };

  const selections: Selections = {};

  for (const position of ballot.positions) {
    const value = raw[position.id];
    if (value === undefined) {
      if (requireAll) return { ok: false, error: `Make a choice for ${position.title}` };
      selections[position.id] = [];
      continue;
    }
    if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
      return { ok: false, error: `Invalid choice for ${position.title}` };
    }
    const choices = Array.from(new Set(value as string[]));

    if (choices.length === 1 && choices[0] === ABSTAIN) {
      if (!position.allowAbstain) return { ok: false, error: `Abstaining isn't allowed for ${position.title}` };
      selections[position.id] = [];
      continue;
    }

    if (position.type === "yesno") {
      if (choices.length !== 1 || (choices[0] !== "yes" && choices[0] !== "no")) {
        return { ok: false, error: `Choose Yes or No for ${position.title}` };
      }
      selections[position.id] = choices;
      continue;
    }

    const candidateIds = new Set(position.candidates.map((c) => c.id));
    if (choices.some((c) => !candidateIds.has(c))) return { ok: false, error: `Invalid candidate for ${position.title}` };
    if (choices.length === 0) {
      if (requireAll) return { ok: false, error: `Make a choice for ${position.title}` };
      selections[position.id] = [];
      continue;
    }
    if (position.type === "single" && choices.length !== 1) {
      return { ok: false, error: `Choose one candidate for ${position.title}` };
    }
    if (choices.length > position.maxSelections) {
      return { ok: false, error: `Choose at most ${position.maxSelections} for ${position.title}` };
    }
    selections[position.id] = choices;
  }

  return { ok: true, selections };
}
