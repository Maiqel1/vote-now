import Link from "next/link";
import { AccountForm } from "@/components/dashboard/AccountForm";
import { Badge } from "@/components/ui/badge";
import { isEmailVerified, requireUser } from "@/lib/auth/session";
import { isCustomPlan } from "@/lib/plans";
import { countActiveElections } from "@/lib/server/elections";
import { limitsForUser } from "@/lib/server/limits";

export const metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser("/dashboard/account");
  const [verified, active, limits] = await Promise.all([isEmailVerified(user.uid), countActiveElections(user.uid), limitsForUser(user.uid)]);

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 pt-10 md:px-6">
      <h1 className="text-3xl font-bold">Account</h1>

      <section className="surface space-y-5 rounded-2xl p-6">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Email</div>
          <div className="mt-1 flex items-center gap-2 text-sm">
            {user.email}
            {verified ? (
              <Badge variant="green">Verified</Badge>
            ) : (
              <Link href="/verify-email?next=/dashboard/account">
                <Badge variant="amber">Verify now</Badge>
              </Link>
            )}
          </div>
        </div>
        <AccountForm name={user.name} />
      </section>

      <section className="surface space-y-3 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Plan</h2>
          <Badge variant="amber">{isCustomPlan(limits) ? "Custom" : "Free"}</Badge>
        </div>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li>
            {active} of {limits.activeElections} active elections in use
          </li>
          <li>Up to {limits.votersPerElection.toLocaleString()} voters per election</li>
          <li>
            {limits.positionsPerElection} positions and {limits.candidatesPerElection} candidates per election
          </li>
          <li>{limits.reminderRounds} reminder rounds per election</li>
        </ul>
      </section>
    </main>
  );
}
