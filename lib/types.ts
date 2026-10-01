export type Role = "owner" | "admin" | "observer";
export type ResultsVisibility = "live" | "afterClose" | "manual" | "private";
export type PositionType = "single" | "multi" | "yesno";
export type EffectiveStatus = "draft" | "scheduled" | "open" | "paused" | "closed";
export type InviteStatus = "notSent" | "sent" | "failed" | "printed";

export interface Candidate {
  id: string;
  name: string;
  bio: string;
  photoUrl: string | null;
}

export interface Position {
  id: string;
  title: string;
  description: string;
  type: PositionType;
  maxSelections: number;
  allowAbstain: boolean;
  candidates: Candidate[];
}

export interface Ballot {
  positions: Position[];
  updatedAt: number;
}

export interface Election {
  id: string;
  slug: string;
  title: string;
  orgName: string;
  description: string;
  logoUrl: string | null;
  accentColor: string | null;
  ownerId: string;
  members: Record<string, Role>;
  memberIds: string[];
  status: "draft" | "published";
  paused: boolean;
  startsAt: number;
  endsAt: number;
  timezone: string;
  results: { visibility: ResultsVisibility; publishedAt: number | null };
  ballotOptions: { shuffle: boolean; requireAll: boolean };
  lockedAt: number | null;
  reminderRound: number;
  inviteMessage: string;
  counts: { voters: number; invited: number };
  piiPurgedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface Voter {
  id: string;
  email: string;
  emailLower: string;
  name: string;
  tokenHash: string | null;
  codeHash: string | null;
  invite: {
    status: InviteStatus;
    sentAt: number | null;
    count: number;
    reminderDue: boolean;
    lastError: string | null;
  };
  hasVoted: boolean;
  votedAt: number | null;
  source: "manual" | "import";
  createdAt: number;
}

export interface VoterRow {
  id: string;
  email: string;
  name: string;
  inviteStatus: InviteStatus;
  sentAt: number | null;
  inviteCount: number;
  lastError: string | null;
  hasVoted: boolean;
  votedAt: number | null;
}

export type Selections = Record<string, string[]>;

export interface TallyShard {
  counts: Record<string, Record<string, number>>;
  total: number;
}

export interface AuditEntry {
  id: string;
  actorUid: string | null;
  actorName: string;
  action: string;
  meta: Record<string, unknown>;
  at: number;
}

export interface TeamInvite {
  id: string;
  email: string;
  role: Exclude<Role, "owner">;
  tokenHash: string;
  invitedBy: string;
  expiresAt: number;
  createdAt: number;
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };
