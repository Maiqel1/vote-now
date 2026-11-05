import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ManagePoll } from "@/components/polls/ManagePoll";
import { PollShell } from "@/components/polls/PollShell";
import { isPollCode } from "@/lib/polls";

export const metadata: Metadata = { title: "Manage poll", robots: { index: false, follow: false } };

export default function ManagePollPage({ params }: { params: { code: string } }) {
  if (!isPollCode(params.code)) notFound();
  return (
    <PollShell>
      <ManagePoll code={params.code} />
    </PollShell>
  );
}
