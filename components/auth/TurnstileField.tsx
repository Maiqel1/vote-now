"use client";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { forwardRef } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export const turnstileConfigured = Boolean(SITE_KEY);

export const TurnstileField = forwardRef<TurnstileInstance | undefined, { onToken: (token: string | null) => void }>(
  function TurnstileField({ onToken }, ref) {
    if (!SITE_KEY) return null;
    return (
      <Turnstile
        ref={ref}
        siteKey={SITE_KEY}
        options={{ theme: "dark", size: "flexible" }}
        onSuccess={(token) => onToken(token)}
        onExpire={() => onToken(null)}
        onError={() => onToken(null)}
      />
    );
  },
);
