import type { EffectiveStatus } from "./types";

export type VoterAccess = "email" | "google";

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

export function voterAccessOf(value: unknown): VoterAccess {
  return value === "google" ? "google" : "email";
}

export function emailKeyOf(email: string): string {
  const lower = email.trim().toLowerCase();
  const at = lower.lastIndexOf("@");
  if (at <= 0) return lower;
  const domain = lower.slice(at + 1);
  if (!GMAIL_DOMAINS.has(domain)) return lower;
  const local = lower.slice(0, at).split("+")[0].replace(/\./g, "");
  return `${local}@gmail.com`;
}

export function canChangeVoterAccess(status: EffectiveStatus): boolean {
  return status === "draft" || status === "scheduled";
}

export function voterAccessChangeProblem(input: {
  target: VoterAccess;
  status: EffectiveStatus;
  voters: number;
  emailLimit: number;
}): string | null {
  if (!canChangeVoterAccess(input.status)) return "How voters get in is locked once voting starts.";
  if (input.target === "email" && input.voters > input.emailLimit) {
    return `Your list has ${input.voters.toLocaleString()} voters, more than email invitations allow (${input.emailLimit.toLocaleString()}). Remove some voters or keep Google sign-in.`;
  }
  return null;
}

export type GoogleVoterDecision =
  | { ok: true; voterId: string }
  | { ok: false; reason: "unverified" | "notListed" | "alreadyVoted" };

export function googleVoterDecision(
  identity: { email: string | null; emailVerified: boolean },
  voter: { id: string; hasVoted: boolean } | null,
): GoogleVoterDecision {
  if (!identity.email || !identity.emailVerified) return { ok: false, reason: "unverified" };
  if (!voter) return { ok: false, reason: "notListed" };
  if (voter.hasVoted) return { ok: false, reason: "alreadyVoted" };
  return { ok: true, voterId: voter.id };
}
