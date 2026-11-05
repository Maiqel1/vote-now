import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { expectedHostnames, verifyTurnstile } from "@/lib/server/turnstile";

const REAL_SECRET = "0x4AAAAAAAtestsecretvalue";

function respondWith(body: unknown, ok = true) {
  const fetchMock = vi.fn(async () => ({ ok, json: async () => body }) as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("Turnstile verification", () => {
  beforeEach(() => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", REAL_SECRET);
    vi.stubEnv("APP_URL", "https://vote-now.xyz");
    vi.stubEnv("TURNSTILE_HOSTNAMES", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("is skipped when no secret is configured", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const fetchMock = respondWith({});
    expect(await verifyTurnstile(undefined, "1.2.3.4", "account")).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects missing, non-string or oversized tokens without calling Cloudflare", async () => {
    const fetchMock = respondWith({ success: true });
    expect(await verifyTurnstile(undefined, "1.2.3.4", "account")).toBe(false);
    expect(await verifyTurnstile("", "1.2.3.4", "account")).toBe(false);
    expect(await verifyTurnstile(42, "1.2.3.4", "account")).toBe(false);
    expect(await verifyTurnstile("x".repeat(2049), "1.2.3.4", "account")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts a token for the right action and our own domain, sending the visitor's IP", async () => {
    const fetchMock = respondWith({ success: true, action: "poll_vote", hostname: "vote-now.xyz" });
    expect(await verifyTurnstile("token", "1.2.3.4", "poll_vote")).toBe(true);
    const body = (fetchMock.mock.calls[0] as unknown as [string, { body: URLSearchParams }])[1].body;
    expect(body.get("remoteip")).toBe("1.2.3.4");
    expect(body.get("response")).toBe("token");
  });

  it("rejects a token made for a different action or another domain", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    respondWith({ success: true, action: "poll_create", hostname: "vote-now.xyz" });
    expect(await verifyTurnstile("token", "1.2.3.4", "poll_vote")).toBe(false);
    respondWith({ success: true, action: "poll_vote", hostname: "evil.example" });
    expect(await verifyTurnstile("token", "1.2.3.4", "poll_vote")).toBe(false);
  });

  it("fails closed on a failed check, an HTTP error or a network error", async () => {
    respondWith({ success: false, "error-codes": ["invalid-input-response"] });
    expect(await verifyTurnstile("token", "1.2.3.4", "account")).toBe(false);
    respondWith({ success: true, action: "account", hostname: "vote-now.xyz" }, false);
    expect(await verifyTurnstile("token", "1.2.3.4", "account")).toBe(false);
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("timeout"))));
    expect(await verifyTurnstile("token", "1.2.3.4", "account")).toBe(false);
  });

  it("skips the action and domain checks for Cloudflare's test keys", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA");
    respondWith({ success: true, hostname: "example.com" });
    expect(await verifyTurnstile("XXXX.DUMMY.TOKEN.XXXX", "1.2.3.4", "account")).toBe(true);
  });

  it("takes the allowed domains from TURNSTILE_HOSTNAMES, falling back to APP_URL", () => {
    expect([...expectedHostnames()]).toEqual(["vote-now.xyz"]);
    vi.stubEnv("TURNSTILE_HOSTNAMES", "staging.vote-now.xyz, Vote-Now.xyz");
    expect([...expectedHostnames()]).toEqual(["staging.vote-now.xyz", "vote-now.xyz"]);
  });
});
