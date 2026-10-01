import { notFound } from "next/navigation";
import { PublicShell } from "@/components/public/PublicShell";
import { VerifyReceipt } from "@/components/public/VerifyReceipt";
import { loadPublicElection } from "@/lib/server/public-election";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verify your vote", robots: { index: false } };

export default async function VerifyPage({ params }: { params: { slug: string } }) {
  const loaded = await loadPublicElection(params.slug);
  if (!loaded || loaded.preview) notFound();
  const { election } = loaded;

  return (
    <PublicShell election={election}>
      <div className="mx-auto max-w-md animate-fade-up">
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-3xl font-bold md:text-4xl">Verify your vote</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Enter the receipt code you got after voting in {election.title}. We&apos;ll confirm your ballot was counted. Your choices stay secret.
          </p>
        </div>
        <VerifyReceipt slug={election.slug} />
      </div>
    </PublicShell>
  );
}
