import Link from "next/link";
import { NewElectionWizard } from "@/components/dashboard/NewElectionWizard";
import { Notice } from "@/components/feedback/Notice";
import { requireUser } from "@/lib/auth/session";
import { FREE_PLAN } from "@/lib/plans";
import { countActiveElections } from "@/lib/server/elections";

export const metadata = { title: "New election" };

export default async function NewElectionPage() {
  const user = await requireUser("/dashboard/new");
  const active = await countActiveElections(user.uid);

  return (
    <main className="mx-auto max-w-6xl px-4 pt-10 md:px-6">
      <Link href="/dashboard" className="mb-6 inline-block text-xs text-muted-foreground hover:text-brand-strong">
        ← All elections
      </Link>
      <div className="mx-auto mb-8 max-w-2xl">
        <h1 className="mb-1 text-3xl font-bold md:text-4xl">New election</h1>
        <p className="text-sm text-muted-foreground">Start with the basics. You&apos;ll add positions, candidates and voters next.</p>
      </div>
      {active >= FREE_PLAN.activeElections ? (
        <div className="mx-auto max-w-2xl">
          <Notice tone="warning">
            The free plan allows {FREE_PLAN.activeElections} active elections at a time. Delete a draft or wait for one to close.
          </Notice>
        </div>
      ) : (
        <NewElectionWizard />
      )}
    </main>
  );
}
