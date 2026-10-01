import { Resend } from "resend";
import type { EmailTransport } from "../index";

let client: Resend | null = null;

export const resendTransport: EmailTransport = async (email) => {
  client ??= new Resend(process.env.RESEND_API_KEY);
  const { error } = await client.emails.send({
    from: email.from,
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    replyTo: email.replyTo,
  });
  if (error) throw new Error(error.message);
};
