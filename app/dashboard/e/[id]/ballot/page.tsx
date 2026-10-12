import { BallotEditor } from "@/components/dashboard/BallotEditor";
import { isBallotLocked } from "@/lib/election-status";
import { getBallot } from "@/lib/server/elections";
import { limitsForElection } from "@/lib/server/limits";
import { loadElectionPage } from "@/lib/server/page";

export const metadata = { title: "Ballot" };

export default async function BallotPage({ params }: { params: { id: string } }) {
  const { election, canEdit } = await loadElectionPage(params.id);
  const [ballot, limits] = await Promise.all([getBallot(election.id), limitsForElection(election)]);
  return <BallotEditor electionId={election.id} initial={ballot} limits={limits} locked={!canEdit || isBallotLocked(election)} />;
}
