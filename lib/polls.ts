import { z } from "zod";

export const POLL_LIMITS = {
  title: 120,
  question: 200,
  option: 80,
  minOptions: 2,
  maxOptions: 10,
  maxQuestions: 10,
  maxDomains: 5,
} as const;
export const POLL_SHARDS = 20;
export const POLL_CODE_LENGTH = 8;
export const POLL_KEY_GRACE_MS = 24 * 60 * 60 * 1000;

export const POLL_DURATIONS = [
  { minutes: 15, label: "15 minutes" },
  { minutes: 60, label: "1 hour" },
  { minutes: 360, label: "6 hours" },
  { minutes: 1440, label: "24 hours" },
  { minutes: 4320, label: "3 days" },
  { minutes: 10080, label: "7 days" },
] as const;

export const DEFAULT_POLL_DURATION = 1440;

export type PollResultsVisibility = "live" | "afterEnd";
export type PollStatus = "open" | "closed" | "removed";
export type PollChoices = Record<string, string[]>;

export interface PollOption {
  id: string;
  label: string;
}

export interface PollQuestion {
  id: string;
  text: string;
  multi: boolean;
  required: boolean;
  options: PollOption[];
}

export interface Poll {
  code: string;
  title: string;
  questions: PollQuestion[];
  strict: boolean;
  allowedDomains: string[];
  resultsVisibility: PollResultsVisibility;
  createdAt: number;
  endsAt: number;
  closedAt: number | null;
  creatorUid: string | null;
  manageKeyHash: string;
  reportCount: number;
  removedAt: number | null;
}

export interface PollShard {
  total: number;
  counts: Record<string, Record<string, number>>;
  answered: Record<string, number>;
}

export type PollResults = PollShard;

const questionSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Every question needs some text")
    .max(POLL_LIMITS.question, `Keep each question under ${POLL_LIMITS.question} characters`),
  options: z
    .array(z.string().trim().max(POLL_LIMITS.option, `Keep each option under ${POLL_LIMITS.option} characters`))
    .max(POLL_LIMITS.maxOptions, `Up to ${POLL_LIMITS.maxOptions} options per question`)
    .transform((list) => list.filter(Boolean)),
  multi: z.boolean(),
  required: z.boolean(),
});

export function normalizeDomain(input: string): string {
  return input.trim().toLowerCase().replace(/^@+/, "").replace(/^\*\./, "").replace(/\.$/, "");
}

export function isValidDomain(domain: string): boolean {
  return /^(?=.{3,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain);
}

export function parseDomains(input: string): string[] {
  return [...new Set(input.split(/[\s,;]+/).map(normalizeDomain).filter(Boolean))];
}

export function emailAllowed(email: string | null | undefined, domains: string[]): boolean {
  if (domains.length === 0) return true;
  const domain = email?.toLowerCase().split("@").at(-1);
  if (!email?.includes("@") || !domain) return false;
  return domains.some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`));
}

export function formatDomains(domains: string[]): string {
  const labels = domains.map((d) => `@${d}`);
  return labels.length <= 1 ? labels.join("") : `${labels.slice(0, -1).join(", ")} or ${labels.at(-1)}`;
}

export const createPollSchema = z
  .object({
    title: z.string().trim().max(POLL_LIMITS.title, `Keep the title under ${POLL_LIMITS.title} characters`),
    questions: z
      .array(questionSchema)
      .min(1, "Add a question")
      .max(POLL_LIMITS.maxQuestions, `Up to ${POLL_LIMITS.maxQuestions} questions`),
    strict: z.boolean(),
    allowedDomains: z.string().max(400).optional().default("").transform(parseDomains),
    resultsVisibility: z.enum(["live", "afterEnd"]),
    durationMinutes: z
      .number()
      .int()
      .refine((m) => POLL_DURATIONS.some((d) => d.minutes === m), "Pick how long the poll runs"),
  })
  .superRefine((value, ctx) => {
    const several = value.questions.length > 1;
    if (several && !value.title) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Give your poll a title", path: ["title"] });
    }
    if (value.strict) {
      const bad = value.allowedDomains.find((domain) => !isValidDomain(domain));
      if (bad) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `"${bad}" isn't a valid email domain`, path: ["allowedDomains"] });
      } else if (value.allowedDomains.length > POLL_LIMITS.maxDomains) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Up to ${POLL_LIMITS.maxDomains} email domains`,
          path: ["allowedDomains"],
        });
      }
    }
    value.questions.forEach((question, i) => {
      const prefix = several ? `Question ${i + 1}: ` : "";
      if (question.options.length < POLL_LIMITS.minOptions) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${prefix}add at least ${POLL_LIMITS.minOptions} options`,
          path: ["questions", i, "options"],
        });
      } else if (new Set(question.options.map((o) => o.toLowerCase())).size !== question.options.length) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${prefix}each option must be different`, path: ["questions", i, "options"] });
      }
    });
  });

export type CreatePollInput = z.input<typeof createPollSchema>;
export type CreatePollData = z.output<typeof createPollSchema>;

export function buildPoll(
  data: Pick<CreatePollData, "title" | "questions"> & Partial<Pick<CreatePollData, "strict" | "allowedDomains">>,
): Pick<Poll, "title" | "questions" | "allowedDomains"> {
  const single = data.questions.length === 1;
  return {
    allowedDomains: data.strict ? data.allowedDomains ?? [] : [],
    title: single ? data.questions[0].text : data.title,
    questions: data.questions.map((q, i) => ({
      id: `q${i + 1}`,
      text: q.text,
      multi: q.multi,
      required: single ? true : q.required,
      options: q.options.map((label, j) => ({ id: `o${j + 1}`, label })),
    })),
  };
}

export function isPollCode(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9]{8}$/.test(value);
}

export function isFingerprint(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

export function isDeviceId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(value);
}

export function pollEndsAt(poll: Pick<Poll, "endsAt" | "closedAt">): number {
  return poll.closedAt !== null ? Math.min(poll.closedAt, poll.endsAt) : poll.endsAt;
}

export function pollStatus(poll: Pick<Poll, "endsAt" | "closedAt" | "removedAt">, now = Date.now()): PollStatus {
  if (poll.removedAt !== null) return "removed";
  return now >= pollEndsAt(poll) ? "closed" : "open";
}

export function resultsVisible(poll: Pick<Poll, "endsAt" | "closedAt" | "removedAt" | "resultsVisibility">, now = Date.now()): boolean {
  return poll.resultsVisibility === "live" || pollStatus(poll, now) !== "open";
}

function shortText(text: string): string {
  return text.length > 60 ? `${text.slice(0, 57)}...` : text;
}

export function validateChoices(
  poll: Pick<Poll, "questions">,
  input: unknown,
): { ok: true; choices: PollChoices } | { ok: false; error: string } {
  const single = poll.questions.length === 1;
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: single ? "Pick an option first." : "Answer the questions first." };
  }
  const raw = input as Record<string, unknown>;
  if (Object.keys(raw).some((id) => !poll.questions.some((q) => q.id === id))) {
    return { ok: false, error: "That question isn't on this poll. Refresh and try again." };
  }
  const choices: PollChoices = {};
  for (const question of poll.questions) {
    const value = raw[question.id] ?? [];
    if (!Array.isArray(value)) return { ok: false, error: "That answer isn't valid. Refresh and try again." };
    const picked = [...new Set(value)];
    if (picked.some((c) => typeof c !== "string" || !question.options.some((o) => o.id === c))) {
      return { ok: false, error: "That option isn't on this poll. Refresh and try again." };
    }
    if (!question.multi && picked.length > 1) {
      return { ok: false, error: single ? "This poll takes one answer." : `"${shortText(question.text)}" takes one answer.` };
    }
    if (question.required && picked.length === 0) {
      return { ok: false, error: single ? "Pick an option first." : `Answer "${shortText(question.text)}" first.` };
    }
    if (picked.length > 0) choices[question.id] = picked as string[];
  }
  if (Object.keys(choices).length === 0) return { ok: false, error: "Answer at least one question." };
  return { ok: true, choices };
}

export function networkKey(ip: string): string {
  const value = ip.trim().toLowerCase();
  if (!value || value === "unknown") return "unknown";
  if (!value.includes(":")) return value;
  if (value.startsWith("::ffff:") && value.includes(".")) return value.slice(7);
  const compressed = value.includes("::");
  const [head, tail = ""] = value.split("::");
  const headParts = head ? head.split(":") : [];
  const tailParts = compressed && tail ? tail.split(":") : [];
  const fill = compressed ? Array<string>(Math.max(0, 8 - headParts.length - tailParts.length)).fill("0") : [];
  const groups = [...headParts, ...fill, ...tailParts].map((g) => g.replace(/^0+(?=.)/, ""));
  return `${groups.slice(0, 4).join(":")}::/64`;
}

export function voteKeys(input: {
  code: string;
  deviceIds: string[];
  fingerprint: string | null;
  network: string;
  googleSub: string | null;
}): string[] {
  const keys = [...new Set(input.deviceIds)].map((id) => `${input.code}:device:${id}`);
  if (input.fingerprint) keys.push(`${input.code}:fp:${input.fingerprint}:${input.network}`);
  if (input.googleSub) keys.push(`${input.code}:google:${input.googleSub}`);
  return keys;
}

export function emptyPollResults(): PollResults {
  return { total: 0, counts: {}, answered: {} };
}

export function sumPollShards(shards: Partial<PollShard>[]): PollResults {
  const result = emptyPollResults();
  for (const shard of shards) {
    result.total += shard.total ?? 0;
    for (const [questionId, counts] of Object.entries(shard.counts ?? {})) {
      result.counts[questionId] ??= {};
      for (const [optionId, n] of Object.entries(counts)) {
        result.counts[questionId][optionId] = (result.counts[questionId][optionId] ?? 0) + n;
      }
    }
    for (const [questionId, n] of Object.entries(shard.answered ?? {})) {
      result.answered[questionId] = (result.answered[questionId] ?? 0) + n;
    }
  }
  return result;
}

export function optionShare(votes: number, of: number): number {
  return of === 0 ? 0 : Math.round((votes / of) * 100);
}

export type PublicPoll = Omit<Poll, "manageKeyHash" | "creatorUid" | "reportCount">;

export function toPublicPoll(poll: Poll): PublicPoll {
  return {
    code: poll.code,
    title: poll.title,
    questions: poll.questions,
    strict: poll.strict,
    allowedDomains: poll.allowedDomains,
    resultsVisibility: poll.resultsVisibility,
    createdAt: poll.createdAt,
    endsAt: poll.endsAt,
    closedAt: poll.closedAt,
    removedAt: poll.removedAt,
  };
}

export interface QuestionResults {
  id: string;
  text: string;
  multi: boolean;
  required: boolean;
  answered: number | null;
  options: { id: string; label: string; votes: number | null }[];
}

export interface PollResultsPayload {
  title: string;
  status: PollStatus;
  endsAt: number;
  total: number;
  hidden: boolean;
  questions: QuestionResults[];
}

export function resultsPayload(poll: Poll | PublicPoll, results: PollResults, now = Date.now(), reveal = false): PollResultsPayload {
  const hidden = !reveal && !resultsVisible(poll, now);
  return {
    title: poll.title,
    status: pollStatus(poll, now),
    endsAt: pollEndsAt(poll),
    total: results.total,
    hidden,
    questions: poll.questions.map((q) => ({
      id: q.id,
      text: q.text,
      multi: q.multi,
      required: q.required,
      answered: hidden ? null : results.answered[q.id] ?? 0,
      options: q.options.map((o) => ({ id: o.id, label: o.label, votes: hidden ? null : results.counts[q.id]?.[o.id] ?? 0 })),
    })),
  };
}

export function durationLabel(minutes: number): string {
  return POLL_DURATIONS.find((d) => d.minutes === minutes)?.label ?? `${minutes} minutes`;
}

function parseOptions(value: unknown): PollOption[] {
  return Array.isArray(value)
    ? value.filter((o): o is PollOption => Boolean(o) && typeof o.id === "string" && typeof o.label === "string")
    : [];
}

export function toPoll(code: string, data: Record<string, unknown> | undefined): Poll | null {
  if (!data || typeof data.title !== "string" || !Array.isArray(data.questions)) return null;
  const questions = (data.questions as Record<string, unknown>[])
    .filter((q) => q && typeof q.id === "string" && typeof q.text === "string")
    .map((q) => ({
      id: q.id as string,
      text: q.text as string,
      multi: q.multi === true,
      required: q.required !== false,
      options: parseOptions(q.options),
    }));
  if (questions.length === 0) return null;
  const num = (v: unknown) => (typeof v === "number" ? v : null);
  return {
    code,
    title: data.title,
    questions,
    strict: data.strict === true,
    allowedDomains: Array.isArray(data.allowedDomains)
      ? data.allowedDomains.filter((d): d is string => typeof d === "string" && isValidDomain(d))
      : [],
    resultsVisibility: data.resultsVisibility === "afterEnd" ? "afterEnd" : "live",
    createdAt: num(data.createdAt) ?? 0,
    endsAt: num(data.endsAt) ?? 0,
    closedAt: num(data.closedAt),
    creatorUid: typeof data.creatorUid === "string" ? data.creatorUid : null,
    manageKeyHash: typeof data.manageKeyHash === "string" ? data.manageKeyHash : "",
    reportCount: num(data.reportCount) ?? 0,
    removedAt: num(data.removedAt),
  };
}
