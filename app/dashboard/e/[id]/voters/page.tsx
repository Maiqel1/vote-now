import { VotersManager } from "@/components/dashboard/voters/VotersManager";
import { Notice } from "@/components/feedback/Notice";
import { getEffectiveStatus } from "@/lib/election-status";
import { appUrl } from "@/lib/format";
import { votersCol } from "@/lib/server/elections";
import { loadElectionPage } from "@/lib/server/page";
import type { Voter, VoterRow } from "@/lib/types";

export const metadata = { title: "Voters" };

export default async function VotersPage({ params }: { params: { id: string } }) {
  const { election, canEdit } = await loadElectionPage(params.id);

  if (election.piiPurgedAt !== null) {
    return <Notice tone="info">Voter data for this election was deleted. Aggregate results are kept.</Notice>;
  }

  const snap = await votersCol(election.id).get();
  const voters: VoterRow[] = snap.docs
    .map((d) => {
      const v = d.data() as Voter;
      return {
        id: d.id,
        email: v.email,
        name: v.name,
        inviteStatus: v.invite.status,
        sentAt: v.invite.sentAt,
        inviteCount: v.invite.count,
        lastError: v.invite.lastError,
        hasVoted: v.hasVoted,
        votedAt: v.votedAt,
      };
    })
    .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));

  const status = getEffectiveStatus(election);

  return (
    <VotersManager
      electionId={election.id}
      voters={voters}
      canEdit={canEdit}
      editable={status !== "closed"}
      canSend={election.status === "published" && status !== "closed"}
      electionTitle={election.title}
      orgName={election.orgName}
      entryUrl={appUrl(`/e/${election.slug}/vote`).replace(/^https?:\/\//, "")}
    />
  );
}
