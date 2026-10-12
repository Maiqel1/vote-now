import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { requireUser } from "../auth/session";
import { isSuperadmin } from "../auth/superadmin";
import { getElection, getElectionAccess } from "./elections";

export const loadElectionPage = cache(async (electionId: string) => {
  const user = await requireUser(`/dashboard/e/${electionId}`);
  const access = await getElectionAccess(electionId, user.uid, "observer");
  if (access) return { user, election: access.election, role: access.role, canEdit: access.role !== "observer", support: false };
  if (!isSuperadmin(user)) notFound();
  const election = await getElection(electionId);
  if (!election) notFound();
  return { user, election, role: "observer" as const, canEdit: false, support: true };
});
