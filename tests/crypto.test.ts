import { describe, expect, it } from "vitest";
import { formatCode, generateCode, hashCode, hashToken, normalizeCode, randomId, randomToken } from "@/lib/crypto";

describe("voting credentials", () => {
  it("generates 8-character codes without ambiguous characters", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateCode();
      expect(code).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);
    }
  });

  it("generates unique tokens with enough entropy", () => {
    const tokens = new Set(Array.from({ length: 500 }, () => randomToken()));
    expect(tokens.size).toBe(500);
    expect(randomToken().length).toBeGreaterThanOrEqual(43);
  });

  it("normalizes user-typed codes before hashing", () => {
    expect(normalizeCode(" abcd-2345 ")).toBe("ABCD2345");
    expect(hashCode("e1", "abcd-2345")).toBe(hashCode("e1", "ABCD2345"));
  });

  it("scopes code hashes to the election", () => {
    expect(hashCode("e1", "ABCD2345")).not.toBe(hashCode("e2", "ABCD2345"));
  });

  it("never stores the raw token", () => {
    const token = randomToken();
    expect(hashToken(token)).not.toContain(token);
    expect(hashToken(token)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("formats codes for display", () => {
    expect(formatCode("ABCD2345")).toBe("ABCD-2345");
  });

  it("makes ids that pass ballot validation", () => {
    expect(randomId()).toMatch(/^[a-z0-9]{10}$/);
  });
});
