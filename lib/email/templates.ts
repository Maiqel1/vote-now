import { formatCode } from "../crypto";
import { appUrl, formatDateTime } from "../format";
import type { Election, Role } from "../types";

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

type ElectionInfo = Pick<Election, "title" | "orgName" | "slug" | "startsAt" | "endsAt" | "timezone">;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout(body: string, footer: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e4e4e7;">
<tr><td style="background:#09090b;padding:18px 28px;">
<span style="display:inline-block;width:22px;height:22px;border-radius:6px;background:#f97316;vertical-align:middle;"></span>
<span style="color:#fafafa;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;vertical-align:middle;margin-left:8px;">VoteNow</span>
</td></tr>
<tr><td style="padding:32px 28px 8px;font-size:15px;line-height:1.6;">${body}</td></tr>
<tr><td style="padding:16px 28px 28px;font-size:12px;line-height:1.5;color:#71717a;border-top:1px solid #f4f4f5;">${footer}</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border-radius:999px;background:#18181b;">
<a href="${href}" style="display:inline-block;padding:13px 30px;font-weight:bold;font-size:15px;color:#ffffff;text-decoration:none;border-radius:999px;">${label}</a>
</td></tr></table>`;
}

function voterFooter(election: ElectionInfo): string {
  const support = escapeHtml(process.env.SUPPORT_EMAIL ?? "support@vote-now.xyz");
  return `You received this because ${escapeHtml(election.orgName)} added your email address to the voter list for “${escapeHtml(election.title)}”. Never share your voting link or code. If you think this was sent in error or is abuse, contact <a href="mailto:${support}" style="color:#71717a;">${support}</a>.`;
}

export function invitationEmail(params: {
  election: ElectionInfo;
  voterName: string;
  token: string;
  code: string;
  customMessage?: string;
  kind: "invite" | "reminder" | "resend";
}): RenderedEmail {
  const { election, voterName, token, code, customMessage, kind } = params;
  const link = appUrl(`/e/${election.slug}/vote?t=${encodeURIComponent(token)}`);
  const entryUrl = appUrl(`/e/${election.slug}/vote`);
  const opens = formatDateTime(election.startsAt, election.timezone);
  const closes = formatDateTime(election.endsAt, election.timezone);
  const greeting = voterName ? `Hi ${escapeHtml(voterName.split(" ")[0])},` : "Hello,";
  const formattedCode = formatCode(code);

  const subject =
    kind === "reminder"
      ? `Reminder: you haven't voted yet in ${election.title}`
      : `You're invited to vote in ${election.title}`;

  const intro =
    kind === "reminder"
      ? `Voting in <strong>${escapeHtml(election.title)}</strong> closes on <strong>${closes}</strong> and we haven't received your ballot yet.`
      : `${escapeHtml(election.orgName)} has invited you to vote in <strong>${escapeHtml(election.title)}</strong>.`;

  const replaced =
    kind === "invite"
      ? ""
      : `<p style="margin:0 0 12px;color:#71717a;font-size:13px;">Use the link and code in this email. Any earlier links or codes no longer work.</p>`;

  const message = customMessage
    ? `<div style="margin:16px 0;padding:14px 16px;border-left:3px solid #f97316;background:#fff7ed;white-space:pre-line;">${escapeHtml(customMessage)}</div>`
    : "";

  const html = layout(
    `<p style="margin:0 0 12px;">${greeting}</p>
<p style="margin:0 0 12px;">${intro}</p>
${message}
<p style="margin:0 0 4px;"><strong>Voting opens:</strong> ${opens}<br/><strong>Voting closes:</strong> ${closes}</p>
${button(link, "Cast your vote")}
${replaced}
<p style="margin:0 0 6px;">If the button doesn't work, go to <a href="${entryUrl}" style="color:#c2410c;">${entryUrl}</a> and enter your email address with this code:</p>
<div style="margin:12px 0 20px;padding:14px;background:#f4f4f5;border-radius:10px;text-align:center;font-family:'Courier New',monospace;font-size:24px;letter-spacing:4px;font-weight:bold;">${formattedCode}</div>
<p style="margin:0;color:#71717a;font-size:13px;">This link and code are personal to you and can only be used once.</p>`,
    voterFooter(election),
  );

  const text = [
    voterName ? `Hi ${voterName.split(" ")[0]},` : "Hello,",
    "",
    kind === "reminder"
      ? `Voting in ${election.title} closes on ${closes} and we haven't received your ballot yet.`
      : `${election.orgName} has invited you to vote in ${election.title}.`,
    customMessage ? `\n${customMessage}\n` : "",
    `Voting opens: ${opens}`,
    `Voting closes: ${closes}`,
    "",
    `Cast your vote: ${link}`,
    "",
    `Or go to ${entryUrl} and enter your email with this code: ${formattedCode}`,
    kind === "invite" ? "" : "\nAny earlier links or codes no longer work.",
    "",
    "This link and code are personal to you. Never share them.",
  ].join("\n");

  return { subject, html, text };
}

export function teamInviteEmail(params: {
  election: Pick<Election, "title" | "orgName">;
  inviterName: string;
  role: Exclude<Role, "owner">;
  token: string;
}): RenderedEmail {
  const { election, inviterName, role, token } = params;
  const link = appUrl(`/invite/${encodeURIComponent(token)}`);
  const roleLabel = role === "admin" ? "a co-admin" : "an observer";
  const subject = `${inviterName} invited you to help run ${election.title}`;
  const html = layout(
    `<p style="margin:0 0 12px;">${escapeHtml(inviterName)} invited you to join <strong>${escapeHtml(election.title)}</strong> (${escapeHtml(election.orgName)}) on VoteNow as ${roleLabel}.</p>
${button(link, "Accept invitation")}
<p style="margin:0;color:#71717a;font-size:13px;">The invitation expires in 7 days. You'll need to sign in or create a free VoteNow account with this email address.</p>`,
    `If you weren't expecting this, you can ignore this email.`,
  );
  const text = `${inviterName} invited you to join ${election.title} (${election.orgName}) on VoteNow as ${roleLabel}.\n\nAccept: ${link}\n\nThe invitation expires in 7 days.`;
  return { subject, html, text };
}
