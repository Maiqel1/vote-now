import "server-only";
import { getEffectiveStatus } from "../../election-status";
import { adminDb } from "../../firebase-admin";
import { voterRateKeys } from "../../rate-limit-keys";
import type { EffectiveStatus, InviteStatus, Voter } from "../../types";
import { toElection } from "../elections";
import { rateLimitStates, type RateLimitState } from "../rate-limit";

export interface VoterMatch {
  voterId: string;
  electionId: string;
  electionTitle: string;
  orgName: string;
  electionStatus: EffectiveStatus;
  slug: string;
  email: string;
  name: string;
  inviteStatus: InviteStatus;
  inviteCount: number;
  sentAt: number | null;
  lastError: string | null;
  hasVoted: boolean;
  votedAt: number | null;
  rateLimits: RateLimitState[];
}

export async function findVotersByEmail(email: string): Promise<VoterMatch[]> {
  const target = email.trim().toLowerCase();
  if (!target.includes("@")) return [];
  const db = adminDb();
  const snap = await db.collectionGroup("voters").where("emailLower", "==", target).limit(50).get();
  const electionRefs = snap.docs.map((d) => d.ref.parent.parent!).filter(Boolean);
  if (electionRefs.length === 0) return [];
  const electionSnaps = await db.getAll(...electionRefs);
  const elections = new Map(electionSnaps.map((s) => [s.id, toElection(s.id, s.data())]));

  const matches = await Promise.all(
    snap.docs.map(async (doc) => {
      const voter = doc.data() as Voter;
      const electionId = doc.ref.parent.parent!.id;
      const election = elections.get(electionId);
      if (!election) return null;
      return {
        voterId: doc.id,
        electionId,
        electionTitle: election.title,
        orgName: election.orgName,
        electionStatus: getEffectiveStatus(election),
        slug: election.slug,
        email: voter.email,
        name: voter.name,
        inviteStatus: voter.invite.status,
        inviteCount: voter.invite.count,
        sentAt: voter.invite.sentAt,
        lastError: voter.invite.lastError,
        hasVoted: voter.hasVoted,
        votedAt: voter.votedAt,
        rateLimits: await rateLimitStates(voterRateKeys(electionId, voter.email, doc.id)),
      };
    }),
  );
  return matches.filter((m): m is VoterMatch => m !== null).sort((a, b) => b.electionStatus.localeCompare(a.electionStatus));
}
