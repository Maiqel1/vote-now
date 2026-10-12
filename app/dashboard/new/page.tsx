import Link from "next/link";
import { NewElectionWizard } from "@/components/dashboard/NewElectionWizard";
import { Notice } from "@/components/feedback/Notice";
import { requireUser } from "@/lib/auth/session";
import { countActiveElections } from "@/lib/server/elections";
import { limitsForUser } from "@/lib/server/limits";
import { getPlatformConfig } from "@/lib/server/platform-config";

export const metadata = { title: "New election" };

export default async function NewElectionPage() {
  const user = await requireUser("/dashboard/new");
  const [active, limits, config] = await Promise.all([countActiveElections(user.uid), limitsForUser(user.uid), getPlatformConfig()]);

  return (
    <main className="mx-auto max-w-6xl px-4 pt-10 md:px-6">
      <Link href="/dashboard" className="mb-6 inline-block text-xs text-muted-foreground hover:text-brand-strong">
        ← All elections
      </Link>
      <div className="mx-auto mb-8 max-w-2xl">
        <h1 className="mb-1 text-3xl font-bold md:text-4xl">New election</h1>
        <p className="text-sm text-muted-foreground">Start with the basics. You&apos;ll add positions, candidates and voters next.</p>
      </div>
      {!config.electionsOpen ? (
        <div className="mx-auto max-w-2xl">
          <Notice tone="warning">Creating new elections is paused right now. Please try again later.</Notice>
        </div>
      ) : active >= limits.activeElections ? (
        <div className="mx-auto max-w-2xl">
          <Notice tone="warning">
            Your plan allows {limits.activeElections} active election{limits.activeElections === 1 ? "" : "s"} at a time. Delete a draft or wait for one to close.
          </Notice>
        </div>
      ) : (
        <NewElectionWizard />
      )}
    </main>
  );
}
