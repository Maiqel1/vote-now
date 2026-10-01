import {
  BallotOptionsForm,
  BrandingForm,
  DangerZone,
  DetailsForm,
  ScheduleForm,
  VisibilityForm,
} from "@/components/dashboard/settings/ElectionSettings";
import { TeamSettings, type PendingInvite, type TeamMember } from "@/components/dashboard/settings/TeamSettings";
import { getEffectiveStatus, isBallotLocked } from "@/lib/election-status";
import { adminDb } from "@/lib/firebase-admin";
import { loadElectionPage } from "@/lib/server/page";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ params }: { params: { id: string } }) {
  const { election, role, user, canEdit } = await loadElectionPage(params.id);
  const db = adminDb();
  const [profiles, inviteSnap] = await Promise.all([
    db.getAll(...election.memberIds.map((uid) => db.collection("users").doc(uid))),
    db.collection("teamInvites").where("electionId", "==", election.id).get(),
  ]);

  const members: TeamMember[] = profiles
    .map((p) => ({
      uid: p.id,
      name: (p.data()?.displayName as string | undefined) ?? "",
      email: (p.data()?.email as string | undefined) ?? "",
      role: election.members[p.id],
    }))
    .filter((m) => m.role)
    .sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : a.name.localeCompare(b.name)));

  const invites: PendingInvite[] = inviteSnap.docs.map((d) => ({
    id: d.id,
    email: d.data().email,
    role: d.data().role,
    expiresAt: d.data().expiresAt,
  }));

  const status = getEffectiveStatus(election);
  const key = election.updatedAt;

  return (
    <div className="space-y-6">
      <DetailsForm key={`d-${key}`} election={election} canEdit={canEdit} />
      <ScheduleForm key={`s-${key}`} election={election} status={status} canEdit={canEdit} />
      <VisibilityForm key={`v-${key}`} election={election} canEdit={canEdit} />
      <BallotOptionsForm key={`b-${key}`} election={election} locked={isBallotLocked(election)} canEdit={canEdit} />
      <BrandingForm key={`br-${key}`} election={election} canEdit={canEdit} />
      <TeamSettings electionId={election.id} members={members} invites={invites} currentUid={user.uid} isOwner={role === "owner"} />
      <DangerZone election={election} status={status} role={role} />
    </div>
  );
}
