import type { EmailTransport } from "../index";

export const logTransport: EmailTransport = async (email) => {
  console.info(
    [
      "",
      "──────── email (EMAIL_TRANSPORT=log) ────────",
      `From:     ${email.from}`,
      `To:       ${email.to}`,
      `Reply-To: ${email.replyTo ?? "-"}`,
      `Subject:  ${email.subject}`,
      "",
      email.text,
      "─────────────────────────────────────────────",
      "",
    ].join("\n"),
  );
};
