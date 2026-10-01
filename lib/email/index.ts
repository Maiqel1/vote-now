import { logTransport } from "./transports/log";
import { resendTransport } from "./transports/resend";
import { smtpTransport } from "./transports/smtp";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  fromName?: string;
}

export interface OutgoingEmail extends Omit<EmailMessage, "fromName"> {
  from: string;
}

export type EmailTransport = (email: OutgoingEmail) => Promise<void>;

export type SendResult = "sent" | "skipped";

function transport(): EmailTransport {
  switch (process.env.EMAIL_TRANSPORT ?? "log") {
    case "smtp":
      return smtpTransport;
    case "resend":
      return resendTransport;
    default:
      return logTransport;
  }
}

function senderAddress(): string {
  const configured = process.env.EMAIL_FROM ?? "noreply@vote-now.xyz";
  const match = configured.match(/<([^>]+)>/);
  return (match ? match[1] : configured).trim();
}

function formatFrom(name?: string): string {
  const configured = process.env.EMAIL_FROM ?? "VoteNow <noreply@vote-now.xyz>";
  if (!name) return configured;
  const safeName = name.replace(/["\r\n<>]/g, "").slice(0, 80);
  return `"${safeName}" <${senderAddress()}>`;
}

export function isAllowedRecipient(email: string): boolean {
  const allowlist = process.env.EMAIL_ALLOWLIST;
  if (!allowlist) return true;
  const target = email.toLowerCase();
  return allowlist
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .some((entry) => (entry.startsWith("@") ? target.endsWith(entry) : target === entry));
}

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  if (!isAllowedRecipient(message.to)) {
    console.info(`[email] skipped ${message.to} (not in EMAIL_ALLOWLIST): ${message.subject}`);
    return "skipped";
  }
  const { fromName, ...rest } = message;
  await transport()({ ...rest, from: formatFrom(fromName) });
  return "sent";
}
