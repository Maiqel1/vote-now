import { BallotEditor } from "@/components/dashboard/BallotEditor";
import { isBallotLocked } from "@/lib/election-status";
import { getBallot } from "@/lib/server/elections";
import { loadElectionPage } from "@/lib/server/page";

export const metadata = { title: "Ballot" };

export default async function BallotPage({ params }: { params: { id: string } }) {
  const { election, canEdit } = await loadElectionPage(params.id);
  const ballot = await getBallot(election.id);
  return <BallotEditor electionId={election.id} initial={ballot} locked={!canEdit || isBallotLocked(election)} />;
}
