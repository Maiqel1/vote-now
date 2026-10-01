import { AuthCard } from "@/components/auth/AuthCard";
import { Notice } from "@/components/feedback/Notice";
import { requireUser } from "@/lib/auth/session";
import { hashToken } from "@/lib/crypto";
import { adminDb } from "@/lib/firebase-admin";
import { getElection } from "@/lib/server/elections";
import { AcceptInvite } from "./AcceptInvite";

export const metadata = { title: "Team invitation" };
export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: { token: string } }) {
  const token = decodeURIComponent(params.token);
  const user = await requireUser(`/invite/${encodeURIComponent(token)}`);
  const snap = await adminDb().collection("teamInvites").doc(hashToken(token)).get();
  const invite = snap.data() as { electionId: string; email: string; role: string; expiresAt: number } | undefined;
  const election = invite ? await getElection(invite.electionId) : null;

  if (!invite || !election) {
    return (
      <AuthCard title="Invitation not found">
        <Notice tone="error">This invitation is invalid, has expired or has already been used.</Notice>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="You're invited"
      subtitle={
        <>
          Join <span className="text-foreground">{election.title}</span> as {invite.role === "admin" ? "a co-admin" : "an observer"}.
        </>
      }
    >
      {invite.email !== user.email.toLowerCase() && (
        <Notice tone="warning">
          This invitation was sent to {invite.email}, but you&apos;re signed in as {user.email}. Sign in with the invited address to accept.
        </Notice>
      )}
      <AcceptInvite token={token} />
    </AuthCard>
  );
}
