import Link from "next/link";
import { InvitationsPanel, type InvitationStats } from "@/components/dashboard/InvitationsPanel";
import { Notice } from "@/components/feedback/Notice";
import { isEmailVerified } from "@/lib/auth/session";
import { getEffectiveStatus } from "@/lib/election-status";
import { emailsRemainingToday } from "@/lib/server/email-quota";
import { votersCol } from "@/lib/server/elections";
import { loadElectionPage } from "@/lib/server/page";
import type { Voter } from "@/lib/types";

export const metadata = { title: "Invitations" };

export default async function InvitationsPage({ params }: { params: { id: string } }) {
  const { election, canEdit, user } = await loadElectionPage(params.id);

  if (election.piiPurgedAt !== null) {
    return <Notice tone="info">Voter data for this election was deleted.</Notice>;
  }

  const [snap, verified, emailsLeftToday] = await Promise.all([
    votersCol(election.id).select("invite", "hasVoted").get(),
    isEmailVerified(user.uid),
    emailsRemainingToday(),
  ]);

  const stats: InvitationStats = { notSent: 0, sent: 0, printed: 0, failed: 0, reminderDue: 0, voted: 0, total: snap.size };
  snap.docs.forEach((d) => {
    const v = d.data() as Pick<Voter, "invite" | "hasVoted">;
    stats[v.invite.status] += 1;
    if (v.invite.reminderDue) stats.reminderDue += 1;
    if (v.hasVoted) stats.voted += 1;
  });

  const status = getEffectiveStatus(election);
  let blocked: React.ReactNode = null;
  if (election.status !== "published") {
    blocked = (
      <>
        Publish the election from the <Link href={`/dashboard/e/${election.id}`} className="underline">overview</Link> before sending
        invitations.
      </>
    );
  } else if (status === "closed") {
    blocked = "Voting has closed.";
  } else if (!verified) {
    blocked = (
      <>
        Verify your email address before sending invitations.{" "}
        <Link href={`/verify-email?next=/dashboard/e/${election.id}/invitations`} className="underline">
          Verify now
        </Link>
      </>
    );
  } else if (stats.total === 0) {
    blocked = (
      <>
        <Link href={`/dashboard/e/${election.id}/voters`} className="underline">Add voters</Link> first.
      </>
    );
  }

  return (
    <InvitationsPanel
      electionId={election.id}
      stats={stats}
      message={election.inviteMessage}
      canEdit={canEdit}
      canSend={blocked === null}
      sendBlockedReason={blocked}
      remindersAllowed={status === "open" || status === "paused"}
      reminderRound={election.reminderRound}
      emailsLeftToday={emailsLeftToday}
    />
  );
}
