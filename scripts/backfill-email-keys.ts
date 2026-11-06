import * as dotenv from "dotenv";
import { adminDb } from "../lib/firebase-admin";
import { emailKeyOf } from "../lib/voter-access";

const envArg = process.argv.find((a) => a.startsWith("--env="));
dotenv.config({ path: envArg ? envArg.slice("--env=".length) : ".env.local" });

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const db = adminDb();
  console.log(`Project: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}${dryRun ? " (dry run)" : ""}`);

  const elections = await db.collection("elections").select().get();
  let scanned = 0;
  let updated = 0;
  for (const election of elections.docs) {
    const voters = await election.ref.collection("voters").select("emailLower", "emailKey").get();
    scanned += voters.size;
    const missing = voters.docs.filter((doc) => {
      const emailLower = doc.get("emailLower");
      return typeof emailLower === "string" && doc.get("emailKey") !== emailKeyOf(emailLower);
    });
    if (missing.length === 0) continue;
    console.log(`${election.id}: ${missing.length} of ${voters.size} voters need a key`);
    updated += missing.length;
    if (dryRun) continue;
    for (let i = 0; i < missing.length; i += 400) {
      const batch = db.batch();
      for (const doc of missing.slice(i, i + 400)) batch.update(doc.ref, { emailKey: emailKeyOf(doc.get("emailLower") as string) });
      await batch.commit();
    }
  }
  console.log(`${elections.size} elections, ${scanned} voters scanned, ${updated} ${dryRun ? "would be updated" : "updated"}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
