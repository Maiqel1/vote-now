import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { requireUser } from "../auth/session";
import { getElectionAccess } from "./elections";

export const loadElectionPage = cache(async (electionId: string) => {
  const user = await requireUser(`/dashboard/e/${electionId}`);
  const access = await getElectionAccess(electionId, user.uid, "observer");
  if (!access) notFound();
  return { user, election: access.election, role: access.role, canEdit: access.role !== "observer" };
});
