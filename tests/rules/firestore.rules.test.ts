import { readFileSync } from "fs";
import path from "path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let env: RulesTestEnvironment;
const NOW = Date.now();

function electionData(overrides: Record<string, unknown> = {}) {
  return {
    slug: "test",
    status: "published",
    memberIds: ["owner"],
    members: { owner: "owner" },
    startsAt: NOW - 60_000,
    endsAt: NOW + 60_000,
    results: { visibility: "afterClose", publishedAt: null },
    ...overrides,
  };
}

async function seed(id: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "elections", id), data);
    await setDoc(doc(db, "elections", id, "tallies", "0"), { counts: {}, total: 3 });
    await setDoc(doc(db, "elections", id, "voters", "v1"), { email: "a@b.co", hasVoted: false });
    await setDoc(doc(db, "elections", id, "ballots", "b1"), { selections: {}, receiptHash: "x" });
    await setDoc(doc(db, "elections", id, "audit", "a1"), { action: "x" });
    await setDoc(doc(db, "votes", "president"), { "1": 10 });
    await setDoc(doc(db, "users", "owner"), { email: "o@b.co" });
  });
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-vote-now-rules",
    firestore: { rules: readFileSync(path.resolve(__dirname, "../../firestore.rules"), "utf8") },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

describe("elections", () => {
  it("members can read their election; strangers and anonymous users cannot", async () => {
    await seed("e1", electionData());
    await assertSucceeds(getDoc(doc(env.authenticatedContext("owner").firestore(), "elections", "e1")));
    await assertFails(getDoc(doc(env.authenticatedContext("stranger").firestore(), "elections", "e1")));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "elections", "e1")));
  });

  it("nobody can write from the client, not even the owner", async () => {
    await seed("e1", electionData());
    const owner = env.authenticatedContext("owner").firestore();
    await assertFails(updateDoc(doc(owner, "elections", "e1"), { status: "draft" }));
    await assertFails(setDoc(doc(owner, "elections", "e1", "tallies", "0"), { total: 999 }));
    await assertFails(updateDoc(doc(owner, "elections", "e1", "voters", "v1"), { hasVoted: true }));
    await assertFails(setDoc(doc(owner, "elections", "new"), electionData()));
  });
});

describe("voter data", () => {
  it("is readable by members only", async () => {
    await seed("e1", electionData());
    await assertSucceeds(getDocs(collection(env.authenticatedContext("owner").firestore(), "elections", "e1", "voters")));
    await assertFails(getDocs(collection(env.authenticatedContext("stranger").firestore(), "elections", "e1", "voters")));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "elections", "e1", "voters", "v1")));
  });

  it("ballots are never readable from the client", async () => {
    await seed("e1", electionData());
    await assertFails(getDoc(doc(env.authenticatedContext("owner").firestore(), "elections", "e1", "ballots", "b1")));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "elections", "e1", "ballots", "b1")));
  });

  it("users and rate limit docs are private", async () => {
    await seed("e1", electionData());
    await assertFails(getDoc(doc(env.authenticatedContext("owner").firestore(), "users", "owner")));
  });
});

describe("tallies", () => {
  const tally = (ctx: ReturnType<RulesTestEnvironment["unauthenticatedContext"]>, id: string) =>
    getDoc(doc(ctx.firestore(), "elections", id, "tallies", "0"));

  it("are hidden from the public during voting when results show after close", async () => {
    await seed("e1", electionData());
    await assertFails(tally(env.unauthenticatedContext(), "e1"));
    await assertSucceeds(tally(env.authenticatedContext("owner"), "e1"));
  });

  it("are public after close when results show after close", async () => {
    await seed("e1", electionData({ startsAt: NOW - 120_000, endsAt: NOW - 60_000 }));
    await assertSucceeds(tally(env.unauthenticatedContext(), "e1"));
  });

  it("are public during voting when results are live", async () => {
    await seed("e1", electionData({ results: { visibility: "live", publishedAt: null } }));
    await assertSucceeds(tally(env.unauthenticatedContext(), "e1"));
  });

  it("stay hidden in manual mode until published", async () => {
    await seed("e1", electionData({ endsAt: NOW - 1, results: { visibility: "manual", publishedAt: null } }));
    await assertFails(tally(env.unauthenticatedContext(), "e1"));
    await seed("e2", electionData({ endsAt: NOW - 1, results: { visibility: "manual", publishedAt: NOW } }));
    await assertSucceeds(tally(env.unauthenticatedContext(), "e2"));
  });

  it("are never public for private results or drafts", async () => {
    await seed("e1", electionData({ endsAt: NOW - 1, results: { visibility: "private", publishedAt: null } }));
    await assertFails(tally(env.unauthenticatedContext(), "e1"));
    await seed("e2", electionData({ status: "draft", results: { visibility: "live", publishedAt: null } }));
    await assertFails(tally(env.unauthenticatedContext(), "e2"));
  });
});

describe("legacy 2025 tallies", () => {
  it("are publicly readable but not writable", async () => {
    await seed("e1", electionData());
    const anon = env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(anon, "votes", "president")));
    await assertFails(setDoc(doc(anon, "votes", "president"), { "1": 9999 }));
  });
});
