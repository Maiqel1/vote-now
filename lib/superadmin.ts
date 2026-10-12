export function parseEmailList(raw: string | undefined | null): string[] {
  return (raw ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.includes("@"));
}

export function isSuperadminEmail(email: string | null | undefined, raw: string | undefined | null): boolean {
  if (!email) return false;
  return parseEmailList(raw).includes(email.trim().toLowerCase());
}
