import "server-only";
import { cache } from "react";
import { getCurrentUser } from "../auth/session";
import { getElectionBySlug } from "./elections";

export const loadPublicElection = cache(async (slug: string) => {
  const election = await getElectionBySlug(slug);
  if (!election) return null;
  if (election.status === "published") return { election, preview: false };
  const user = await getCurrentUser();
  if (user && election.members[user.uid]) return { election, preview: true };
  return null;
});
