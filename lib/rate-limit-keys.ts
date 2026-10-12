export const RATE_KEYS = {
  session: (ip: string) => `session:${ip}`,
  voterAuthIp: (ip: string) => `voter-auth-ip:${ip}`,
  voterAuthEmail: (electionId: string, email: string) => `voter-auth-email:${electionId}:${email.trim().toLowerCase()}`,
  resendIp: (ip: string) => `resend-ip:${ip}`,
  resendEmail: (electionId: string, email: string) => `resend-email:${electionId}:${email.trim().toLowerCase()}`,
  vote: (electionId: string, voterId: string) => `vote:${electionId}:${voterId}`,
  receipt: (ip: string) => `receipt:${ip}`,
};

export const RATE_KIND_LABELS: Record<string, string> = {
  session: "Organiser sign-in (by IP)",
  "voter-auth-ip": "Voter sign-in (by IP)",
  "voter-auth-email": "Voter sign-in (by email)",
  "resend-ip": "Voting link resend (by IP)",
  "resend-email": "Voting link resend (by email)",
  vote: "Vote submission",
  receipt: "Receipt check (by IP)",
};

export function rateKind(key: string): string {
  const index = key.indexOf(":");
  return index === -1 ? key : key.slice(0, index);
}

export function voterRateKeys(electionId: string, email: string, voterId: string): string[] {
  return [RATE_KEYS.voterAuthEmail(electionId, email), RATE_KEYS.resendEmail(electionId, email), RATE_KEYS.vote(electionId, voterId)];
}

export function ipRateKeys(ip: string): string[] {
  const clean = ip.trim();
  return [RATE_KEYS.session(clean), RATE_KEYS.voterAuthIp(clean), RATE_KEYS.resendIp(clean), RATE_KEYS.receipt(clean)];
}
