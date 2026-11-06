import { VotersManager } from "@/components/dashboard/voters/VotersManager";
import { Notice } from "@/components/feedback/Notice";
import { getEffectiveStatus } from "@/lib/election-status";
import { appUrl } from "@/lib/format";
import { votersCol } from "@/lib/server/elections";
import { limitsForElection } from "@/lib/server/limits";
import { loadElectionPage } from "@/lib/server/page";
import { queryVoters, toVoterRow } from "@/lib/server/voters";
import type { VoterRow } from "@/lib/types";
import { canChangeVoterAccess } from "@/lib/voter-access";

export const metadata = { title: "Voters" };

const FULL_LIST_MAX = 2000;

export default async function VotersPage({ params }: { params: { id: string } }) {
  const { election, canEdit } = await loadElectionPage(params.id);

  if (election.piiPurgedAt !== null) {
    return <Notice tone="info">Voter data for this election was deleted. Aggregate results are kept.</Notice>;
  }

  const total = election.counts.voters;
  const complete = total <= FULL_LIST_MAX;
  const limits = await limitsForElection(election);

  let rows: VoterRow[];
  let next: string | null = null;
  if (complete) {
    const snap = await votersCol(election.id).get();
    rows = snap.docs.map(toVoterRow).sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
  } else {
    const page = await queryVoters(election.id, { filter: "all", search: "", after: null, limit: 100 });
    rows = page.rows;
    next = page.next;
  }

  const status = getEffectiveStatus(election);

  return (
    <VotersManager
      electionId={election.id}
      limits={limits}
      initialRows={rows}
      initialNext={next}
      total={complete ? rows.length : total}
      complete={complete}
      canEdit={canEdit}
      editable={status !== "closed"}
      canSend={election.status === "published" && status !== "closed"}
      electionTitle={election.title}
      orgName={election.orgName}
      entryUrl={appUrl(`/e/${election.slug}/vote`).replace(/^https?:\/\//, "")}
      googleAccess={election.voterAccess === "google"}
      settingsHref={`/dashboard/e/${election.id}/settings`}
      canSwitchAccess={canEdit && canChangeVoterAccess(status)}
    />
  );
}
