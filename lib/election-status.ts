import type { Election, EffectiveStatus } from "./types";

type StatusFields = Pick<Election, "status" | "paused" | "startsAt" | "endsAt">;
type VisibilityFields = StatusFields & Pick<Election, "results">;

export function getEffectiveStatus(election: StatusFields, now = Date.now()): EffectiveStatus {
  if (election.status === "draft") return "draft";
  if (now >= election.endsAt) return "closed";
  if (now < election.startsAt) return "scheduled";
  if (election.paused) return "paused";
  return "open";
}

export function areResultsPublic(election: VisibilityFields, now = Date.now()): boolean {
  const status = getEffectiveStatus(election, now);
  if (status === "draft") return false;
  switch (election.results.visibility) {
    case "live":
      return true;
    case "afterClose":
      return status === "closed";
    case "manual":
      return election.results.publishedAt !== null;
    case "private":
      return false;
  }
}

export function canPublishResultsManually(election: VisibilityFields, now = Date.now()): boolean {
  return (
    election.results.visibility === "manual" &&
    election.results.publishedAt === null &&
    getEffectiveStatus(election, now) === "closed"
  );
}

export function isBallotLocked(election: StatusFields & Pick<Election, "lockedAt">, now = Date.now()): boolean {
  if (election.lockedAt !== null) return true;
  const status = getEffectiveStatus(election, now);
  return status === "open" || status === "paused" || status === "closed";
}

export const STATUS_LABELS: Record<EffectiveStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  open: "Live",
  paused: "Paused",
  closed: "Closed",
};
