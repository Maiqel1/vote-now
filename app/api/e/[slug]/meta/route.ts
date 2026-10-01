import { NextResponse } from "next/server";
import { getElectionBySlug } from "@/lib/server/elections";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const election = await getElectionBySlug(params.slug);
  if (!election || election.status !== "published") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(
    { title: election.title, orgName: election.orgName, accentColor: election.accentColor },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
