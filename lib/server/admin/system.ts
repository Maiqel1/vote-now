import "server-only";
import { verifySmtp } from "../../email/transports/smtp";
import { adminAuth, adminDb } from "../../firebase-admin";
import { cloudinaryConfigured, pingCloudinary } from "../cloudinary";

export interface EnvCheck {
  name: string;
  label: string;
  set: boolean;
  note?: string;
}

export interface LiveCheck {
  name: string;
  ok: boolean;
  ms: number;
  detail: string;
}

const TEST_TURNSTILE_SECRET = "1x0000000000000000000000000000000AA";

export function environmentInfo() {
  const env = process.env.VERCEL_ENV ?? (process.env.NODE_ENV === "production" ? "production" : "development");
  return {
    environment: env,
    label: env === "production" ? "Production" : env === "preview" ? "Staging" : "Local",
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    commitMessage: process.env.VERCEL_GIT_COMMIT_MESSAGE ?? null,
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    region: process.env.VERCEL_REGION ?? null,
    appUrl: process.env.APP_URL ?? "",
    firebaseProject: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  };
}

export function envChecklist(): EnvCheck[] {
  const has = (name: string) => Boolean(process.env[name]?.trim());
  const transport = process.env.EMAIL_TRANSPORT ?? "log";
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY ?? "";
  return [
    { name: "FIREBASE_SERVICE_ACCOUNT", label: "Firebase service account", set: has("FIREBASE_SERVICE_ACCOUNT") },
    { name: "APP_URL", label: "Public site URL", set: has("APP_URL") },
    { name: "VOTER_SESSION_SECRET", label: "Voter session secret", set: has("VOTER_SESSION_SECRET") && process.env.VOTER_SESSION_SECRET !== "local-dev-secret" },
    { name: "SUPERADMIN_EMAILS", label: "Superadmin emails", set: has("SUPERADMIN_EMAILS") },
    {
      name: "EMAIL_TRANSPORT",
      label: "Email transport",
      set: transport !== "log",
      note: transport === "log" ? "Emails are only logged, not sent" : transport,
    },
    { name: "EMAIL_FROM", label: "Sender address", set: has("EMAIL_FROM") },
    ...(transport === "smtp"
      ? [
          { name: "SMTP_HOST", label: "SMTP host", set: has("SMTP_HOST") },
          { name: "SMTP_USER", label: "SMTP user", set: has("SMTP_USER") },
          { name: "SMTP_PASS", label: "SMTP password", set: has("SMTP_PASS") },
        ]
      : []),
    ...(transport === "resend" ? [{ name: "RESEND_API_KEY", label: "Resend API key", set: has("RESEND_API_KEY") }] : []),
    {
      name: "EMAIL_ALLOWLIST",
      label: "Email allowlist",
      set: has("EMAIL_ALLOWLIST"),
      note: has("EMAIL_ALLOWLIST") ? "Only listed addresses receive email" : "Off: everyone receives email",
    },
    { name: "CLOUDINARY", label: "Cloudinary (images)", set: cloudinaryConfigured() },
    { name: "CLOUDINARY_FOLDER", label: "Cloudinary folder", set: has("CLOUDINARY_FOLDER"), note: process.env.CLOUDINARY_FOLDER },
    {
      name: "TURNSTILE_SECRET_KEY",
      label: "Bot check (Turnstile)",
      set: Boolean(turnstileSecret) && turnstileSecret !== TEST_TURNSTILE_SECRET,
      note: !turnstileSecret ? "Off" : turnstileSecret === TEST_TURNSTILE_SECRET ? "Test keys: always passes" : "On",
    },
  ];
}

async function timed(name: string, fn: () => Promise<string>): Promise<LiveCheck> {
  const started = Date.now();
  try {
    const detail = await fn();
    return { name, ok: true, ms: Date.now() - started, detail };
  } catch (error) {
    return { name, ok: false, ms: Date.now() - started, detail: error instanceof Error ? error.message.slice(0, 200) : "Failed" };
  }
}

export async function liveChecks(): Promise<LiveCheck[]> {
  const transport = process.env.EMAIL_TRANSPORT ?? "log";
  return Promise.all([
    timed("Firestore", async () => {
      await adminDb().collection("config").doc("platform").get();
      return "Read OK";
    }),
    timed("Firebase Auth", async () => {
      await adminAuth().listUsers(1);
      return "Reachable";
    }),
    timed("Email (SMTP)", async () => {
      if (transport !== "smtp") return `Not used (transport is ${transport})`;
      await verifySmtp();
      return "Connected and authenticated";
    }),
    timed("Cloudinary", async () => {
      if (!cloudinaryConfigured()) throw new Error("Not configured");
      await pingCloudinary();
      return "Reachable";
    }),
  ]);
}
