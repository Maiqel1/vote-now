import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTVerifyGetKey } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import {
  buildPoll,
  createPollSchema,
  isDeviceId,
  isFingerprint,
  isPollCode,
  networkKey,
  optionShare,
  pollStatus,
  resultsPayload,
  resultsVisible,
  sumPollShards,
  toPoll,
  validateChoices,
  voteKeys,
  type Poll,
} from "@/lib/polls";
import { RATE_KEYS, rateKind } from "@/lib/rate-limit-keys";
import { verifyGoogleIdToken } from "@/lib/server/google-id";

const NOW = 1_800_000_000_000;

function poll(overrides: Partial<Poll> = {}): Poll {
  return {
    code: "abcd1234",
    ...buildPoll({
      title: "",
      questions: [{ text: "Best day for the meeting?", options: ["Monday", "Friday", "Saturday"], multi: false, required: true }],
    }),
    strict: false,
    resultsVisibility: "live",
    createdAt: NOW - 1000,
    endsAt: NOW + 60_000,
    closedAt: null,
    creatorUid: null,
    manageKeyHash: "hash",
    reportCount: 0,
    removedAt: null,
    ...overrides,
  };
}

function survey(): Poll {
  return poll(
    buildPoll({
      title: "Team survey",
      questions: [
        { text: "Best day?", options: ["Mon", "Fri"], multi: false, required: true },
        { text: "Which snacks?", options: ["Chips", "Fruit", "Cake"], multi: true, required: false },
      ],
    }),
  );
}

const question = (text: string, options: string[], extra: Partial<{ multi: boolean; required: boolean }> = {}) => ({
  text,
  options,
  multi: false,
  required: true,
  ...extra,
});

describe("creating a poll", () => {
  const base = {
    title: "",
    questions: [question("Where should we eat?", ["Pizza", "Sushi"])],
    strict: false,
    resultsVisibility: "live",
    durationMinutes: 60,
  };

  it("accepts a valid poll and drops blank options", () => {
    const result = createPollSchema.safeParse({ ...base, questions: [question("Eat?", ["Pizza", "  ", "Sushi", ""])] });
    expect(result.success && result.data.questions[0].options).toEqual(["Pizza", "Sushi"]);
  });

  it("needs at least two real options per question", () => {
    expect(createPollSchema.safeParse({ ...base, questions: [question("Eat?", ["Pizza", " "])] }).success).toBe(false);
    const result = createPollSchema.safeParse({
      ...base,
      title: "Survey",
      questions: [question("Eat?", ["Pizza", "Sushi"]), question("Drink?", ["Water"])],
    });
    expect(result.success).toBe(false);
    expect(!result.success && result.error.issues[0].message).toBe("Question 2: add at least 2 options");
  });

  it("rejects duplicate options regardless of case", () => {
    expect(createPollSchema.safeParse({ ...base, questions: [question("Eat?", ["Pizza", "pizza"])] }).success).toBe(false);
  });

  it("allows at most ten options and ten questions", () => {
    const eleven = Array.from({ length: 11 }, (_, i) => `Option ${i}`);
    expect(createPollSchema.safeParse({ ...base, questions: [question("Q", eleven)] }).success).toBe(false);
    expect(createPollSchema.safeParse({ ...base, questions: [question("Q", eleven.slice(0, 10))] }).success).toBe(true);
    const many = Array.from({ length: 11 }, (_, i) => question(`Q${i}`, ["A", "B"]));
    expect(createPollSchema.safeParse({ ...base, title: "Big", questions: many }).success).toBe(false);
    expect(createPollSchema.safeParse({ ...base, title: "Big", questions: many.slice(0, 10) }).success).toBe(true);
  });

  it("needs a title only when there are several questions", () => {
    const two = [question("Eat?", ["Pizza", "Sushi"]), question("Drink?", ["Water", "Juice"])];
    expect(createPollSchema.safeParse({ ...base, questions: two }).success).toBe(false);
    expect(createPollSchema.safeParse({ ...base, title: "Party", questions: two }).success).toBe(true);
    expect(createPollSchema.safeParse(base).success).toBe(true);
  });

  it("only allows the preset lengths, up to seven days", () => {
    expect(createPollSchema.safeParse({ ...base, durationMinutes: 10080 }).success).toBe(true);
    expect(createPollSchema.safeParse({ ...base, durationMinutes: 61 }).success).toBe(false);
    expect(createPollSchema.safeParse({ ...base, durationMinutes: 20160 }).success).toBe(false);
  });

  it("limits question length and requires text", () => {
    expect(createPollSchema.safeParse({ ...base, questions: [question("x".repeat(201), ["A", "B"])] }).success).toBe(false);
    expect(createPollSchema.safeParse({ ...base, questions: [question("   ", ["A", "B"])] }).success).toBe(false);
  });

  it("uses the question as the title of a one-question poll, which is always required", () => {
    const built = buildPoll({ title: "ignored", questions: [question("Eat?", ["A", "B"], { required: false })] });
    expect(built.title).toBe("Eat?");
    expect(built.questions[0]).toEqual({
      id: "q1",
      text: "Eat?",
      multi: false,
      required: true,
      options: [
        { id: "o1", label: "A" },
        { id: "o2", label: "B" },
      ],
    });
  });

  it("keeps the title and each question's settings when there are several", () => {
    const built = survey();
    expect(built.title).toBe("Team survey");
    expect(built.questions.map((q) => [q.id, q.multi, q.required])).toEqual([
      ["q1", false, true],
      ["q2", true, false],
    ]);
  });
});

describe("poll status and result visibility", () => {
  it("is open until it ends, and can be ended early", () => {
    expect(pollStatus(poll(), NOW)).toBe("open");
    expect(pollStatus(poll(), NOW + 60_000)).toBe("closed");
    expect(pollStatus(poll({ closedAt: NOW - 1 }), NOW)).toBe("closed");
  });

  it("treats removal as final", () => {
    expect(pollStatus(poll({ removedAt: NOW - 5 }), NOW)).toBe("removed");
  });

  it("hides results until the end only when asked to", () => {
    expect(resultsVisible(poll(), NOW)).toBe(true);
    expect(resultsVisible(poll({ resultsVisibility: "afterEnd" }), NOW)).toBe(false);
    expect(resultsVisible(poll({ resultsVisibility: "afterEnd" }), NOW + 60_000)).toBe(true);
    expect(resultsVisible(poll({ resultsVisibility: "afterEnd", closedAt: NOW - 1 }), NOW)).toBe(true);
  });

  it("withholds counts while hidden but keeps the number of voters", () => {
    const tally = { total: 5, counts: { q1: { o1: 3, o2: 2 } }, answered: { q1: 5 } };
    const hidden = resultsPayload(poll({ resultsVisibility: "afterEnd" }), tally, NOW);
    expect(hidden.hidden).toBe(true);
    expect(hidden.total).toBe(5);
    expect(hidden.questions[0].answered).toBeNull();
    expect(hidden.questions[0].options.every((o) => o.votes === null)).toBe(true);
    const revealed = resultsPayload(poll({ resultsVisibility: "afterEnd" }), tally, NOW, true);
    expect(revealed.questions[0].options.map((o) => o.votes)).toEqual([3, 2, 0]);
    expect(revealed.questions[0].answered).toBe(5);
  });

  it("reports results per question", () => {
    const tally = { total: 4, counts: { q1: { o1: 4 }, q2: { o1: 1, o3: 2 } }, answered: { q1: 4, q2: 2 } };
    const payload = resultsPayload(survey(), tally, NOW);
    expect(payload.title).toBe("Team survey");
    expect(payload.questions.map((q) => q.answered)).toEqual([4, 2]);
    expect(payload.questions[1].options.map((o) => o.votes)).toEqual([1, 0, 2]);
  });
});

describe("choices", () => {
  it("takes exactly one answer on a single-choice question", () => {
    expect(validateChoices(poll(), { q1: ["o1"] })).toEqual({ ok: true, choices: { q1: ["o1"] } });
    expect(validateChoices(poll(), { q1: ["o1", "o2"] }).ok).toBe(false);
  });

  it("takes several answers on a multi-choice question and ignores repeats", () => {
    expect(validateChoices(survey(), { q1: ["o2"], q2: ["o1", "o3", "o1"] })).toEqual({
      ok: true,
      choices: { q1: ["o2"], q2: ["o1", "o3"] },
    });
  });

  it("requires required questions but lets optional ones be skipped", () => {
    expect(validateChoices(survey(), { q1: ["o1"] })).toEqual({ ok: true, choices: { q1: ["o1"] } });
    expect(validateChoices(survey(), { q1: ["o1"], q2: [] })).toEqual({ ok: true, choices: { q1: ["o1"] } });
    const missing = validateChoices(survey(), { q2: ["o1"] });
    expect(missing.ok).toBe(false);
    expect(!missing.ok && missing.error).toBe('Answer "Best day?" first.');
  });

  it("rejects empty, unknown or malformed answers", () => {
    expect(validateChoices(poll(), {}).ok).toBe(false);
    expect(validateChoices(poll(), { q1: [] }).ok).toBe(false);
    expect(validateChoices(poll(), { q1: ["o9"] }).ok).toBe(false);
    expect(validateChoices(poll(), { q9: ["o1"] }).ok).toBe(false);
    expect(validateChoices(poll(), { q1: "o1" }).ok).toBe(false);
    expect(validateChoices(poll(), ["o1"]).ok).toBe(false);
    expect(validateChoices(poll(), null).ok).toBe(false);
  });
});

describe("repeat-vote keys", () => {
  const fp = "a".repeat(64);
  const base = { code: "abcd1234", strict: false, deviceIds: ["device-aaaaaaaaaaaa"], fingerprint: fp, network: "1.2.3.4", googleSub: null };

  it("gives the same device the same key every time", () => {
    expect(voteKeys(base)).toEqual(voteKeys({ ...base }));
    expect(voteKeys(base)).toContain("abcd1234:device:device-aaaaaaaaaaaa");
  });

  it("records each device id once", () => {
    const keys = voteKeys({ ...base, deviceIds: ["device-aaaaaaaaaaaa", "device-aaaaaaaaaaaa", "device-bbbbbbbbbbbb"] });
    expect(keys.filter((k) => k.includes(":device:"))).toHaveLength(2);
  });

  it("ties the fingerprint to the network", () => {
    const sameNetwork = voteKeys({ ...base, deviceIds: ["incognito-cccccccccc"] });
    expect(sameNetwork).toContain(`abcd1234:fp:${fp}:1.2.3.4`);
    const otherNetwork = voteKeys({ ...base, network: "5.6.7.8" });
    expect(otherNetwork).not.toContain(`abcd1234:fp:${fp}:1.2.3.4`);
  });

  it("scopes keys to the poll", () => {
    const other = voteKeys({ ...base, code: "zzzz9999" });
    expect(other.some((k) => voteKeys(base).includes(k))).toBe(false);
  });

  it("uses only the Google account in strict mode", () => {
    expect(voteKeys({ ...base, strict: true, googleSub: "1234" })).toEqual(["abcd1234:google:1234"]);
    expect(voteKeys({ ...base, strict: true, googleSub: null })).toEqual([]);
  });
});

describe("network keys", () => {
  it("keeps IPv4 addresses whole", () => {
    expect(networkKey(" 102.89.1.7 ")).toBe("102.89.1.7");
  });

  it("groups IPv6 addresses by their /64 network", () => {
    const a = networkKey("2001:db8:85a3:12:aaaa:bbbb:cccc:dddd");
    expect(a).toBe("2001:db8:85a3:12::/64");
    expect(networkKey("2001:db8:85a3:12::1")).toBe(a);
    expect(networkKey("2001:0db8:85a3:0012:0:0:0:9")).toBe(a);
    expect(networkKey("2001:db8:85a3:13::1")).not.toBe(a);
    expect(networkKey("2001:db8::1")).toBe("2001:db8:0:0::/64");
  });

  it("unwraps IPv4-mapped addresses and handles unknowns", () => {
    expect(networkKey("::ffff:10.0.0.1")).toBe("10.0.0.1");
    expect(networkKey("unknown")).toBe("unknown");
    expect(networkKey("")).toBe("unknown");
  });
});

describe("format checks", () => {
  it("recognises poll codes, fingerprints and device ids", () => {
    expect(isPollCode("abcd1234")).toBe(true);
    expect(isPollCode("ABCD1234")).toBe(false);
    expect(isPollCode("abc/1234")).toBe(false);
    expect(isFingerprint("f".repeat(64))).toBe(true);
    expect(isFingerprint("f".repeat(63))).toBe(false);
    expect(isDeviceId("Ab_-0123456789abcdef")).toBe(true);
    expect(isDeviceId("short")).toBe(false);
    expect(isDeviceId("has space in it here")).toBe(false);
  });
});

describe("tallies", () => {
  it("adds up the shards per question", () => {
    expect(
      sumPollShards([
        { total: 2, counts: { q1: { o1: 1, o2: 1 }, q2: { o1: 1 } }, answered: { q1: 2, q2: 1 } },
        { total: 1, counts: { q1: { o1: 1 } }, answered: { q1: 1 } },
        {},
      ]),
    ).toEqual({ total: 3, counts: { q1: { o1: 2, o2: 1 }, q2: { o1: 1 } }, answered: { q1: 3, q2: 1 } });
  });

  it("works out shares of voters", () => {
    expect(optionShare(1, 3)).toBe(33);
    expect(optionShare(0, 0)).toBe(0);
  });

  it("reads stored polls defensively", () => {
    expect(toPoll("abcd1234", undefined)).toBeNull();
    expect(toPoll("abcd1234", { title: "T", questions: [] })).toBeNull();
    const parsed = toPoll("abcd1234", {
      title: "T",
      questions: [{ id: "q1", text: "Q", options: [{ id: "o1", label: "A" }, { bad: true }] }, { broken: true }],
      endsAt: 5,
    });
    expect(parsed?.questions).toEqual([{ id: "q1", text: "Q", multi: false, required: true, options: [{ id: "o1", label: "A" }] }]);
    expect(parsed?.closedAt).toBeNull();
    expect(parsed?.resultsVisibility).toBe("live");
  });
});

describe("poll rate-limit keys", () => {
  it("are labelled by kind", () => {
    expect(rateKind(RATE_KEYS.pollVote("abcd1234", "1.2.3.4"))).toBe("poll-vote");
    expect(rateKind(RATE_KEYS.pollCreate("1.2.3.4"))).toBe("poll-create");
  });
});

describe("Google sign-in tokens", () => {
  let keys: JWTVerifyGetKey;
  let sign: (opts?: { iss?: string; aud?: string; exp?: string | number }) => Promise<string>;
  let foreign: string;

  beforeAll(async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256");
    keys = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256" }] });
    sign = (opts = {}) =>
      new SignJWT({})
        .setProtectedHeader({ alg: "RS256", kid: "k1" })
        .setIssuer(opts.iss ?? "https://accounts.google.com")
        .setAudience(opts.aud ?? "client-1")
        .setSubject("1234567890")
        .setIssuedAt()
        .setExpirationTime(opts.exp ?? "1h")
        .sign(privateKey);
    const other = await generateKeyPair("RS256");
    foreign = await new SignJWT({})
      .setProtectedHeader({ alg: "RS256", kid: "k1" })
      .setIssuer("https://accounts.google.com")
      .setAudience("client-1")
      .setSubject("1234567890")
      .setExpirationTime("1h")
      .sign(other.privateKey);
  });

  it("accepts a valid token and returns the account number", async () => {
    expect(await verifyGoogleIdToken(await sign(), "client-1", keys)).toBe("1234567890");
    expect(await verifyGoogleIdToken(await sign({ iss: "accounts.google.com" }), "client-1", keys)).toBe("1234567890");
  });

  it("rejects the wrong audience, issuer or an expired token", async () => {
    expect(await verifyGoogleIdToken(await sign({ aud: "someone-else" }), "client-1", keys)).toBeNull();
    expect(await verifyGoogleIdToken(await sign({ iss: "https://evil.example" }), "client-1", keys)).toBeNull();
    expect(await verifyGoogleIdToken(await sign({ exp: Math.floor(Date.now() / 1000) - 60 }), "client-1", keys)).toBeNull();
  });

  it("rejects tokens signed by anyone else, junk, or when not configured", async () => {
    expect(await verifyGoogleIdToken(foreign, "client-1", keys)).toBeNull();
    expect(await verifyGoogleIdToken("not-a-token", "client-1", keys)).toBeNull();
    expect(await verifyGoogleIdToken(await sign(), null, keys)).toBeNull();
    expect(await verifyGoogleIdToken(undefined, "client-1", keys)).toBeNull();
  });
});
