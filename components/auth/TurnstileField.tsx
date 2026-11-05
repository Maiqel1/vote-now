"use client";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useTheme } from "next-themes";
import { forwardRef } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export const turnstileConfigured = Boolean(SITE_KEY);

export type TurnstileAction = "account" | "voter_sign_in" | "resend_link" | "poll_create" | "poll_vote";

export const TurnstileField = forwardRef<
  TurnstileInstance | undefined,
  { action: TurnstileAction; onToken: (token: string | null) => void }
>(function TurnstileField({ action, onToken }, ref) {
  const { resolvedTheme } = useTheme();
  if (!SITE_KEY) return null;
  return (
    <Turnstile
      ref={ref}
      siteKey={SITE_KEY}
      options={{ action, theme: resolvedTheme === "dark" ? "dark" : "light", size: "flexible" }}
      onSuccess={(token) => onToken(token)}
      onExpire={() => onToken(null)}
      onError={() => onToken(null)}
    />
  );
});
