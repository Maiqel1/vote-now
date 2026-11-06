"use client";

import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useTheme } from "next-themes";
import { forwardRef, useCallback, useMemo, useRef } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export const turnstileConfigured = Boolean(SITE_KEY);

export type TurnstileAction = "account" | "voter_sign_in" | "resend_link" | "poll_create" | "poll_vote";

export interface TurnstileCheck {
  current: () => string | null;
  wait: () => Promise<string | null>;
  reset: () => void;
}

export function useTurnstile() {
  const ref = useRef<TurnstileInstance | undefined>(undefined);
  const token = useRef<string | null>(null);
  const failed = useRef(false);
  const waiters = useRef<((token: string | null) => void)[]>([]);

  const settle = useCallback((value: string | null) => {
    const list = waiters.current;
    waiters.current = [];
    list.forEach((resolve) => resolve(value));
  }, []);

  const onToken = useCallback(
    (value: string | null) => {
      token.current = value;
      if (value) {
        failed.current = false;
        settle(value);
      }
    },
    [settle],
  );

  const onError = useCallback(() => {
    token.current = null;
    failed.current = true;
    settle(null);
  }, [settle]);

  const check = useMemo<TurnstileCheck>(
    () => ({
      current: () => token.current,
      wait: () => {
        if (!turnstileConfigured || failed.current) return Promise.resolve(token.current);
        if (token.current) return Promise.resolve(token.current);
        return new Promise((resolve) => waiters.current.push(resolve));
      },
      reset: () => {
        token.current = null;
        failed.current = false;
        ref.current?.reset();
      },
    }),
    [],
  );

  return { ref, onToken, onError, check };
}

export const TurnstileField = forwardRef<
  TurnstileInstance | undefined,
  {
    action: TurnstileAction;
    onToken: (token: string | null) => void;
    appearance?: "always" | "interaction-only";
    onError?: () => void;
  }
>(function TurnstileField({ action, onToken, appearance = "always", onError }, ref) {
  const { resolvedTheme } = useTheme();
  if (!SITE_KEY) return null;
  return (
    <Turnstile
      ref={ref}
      siteKey={SITE_KEY}
      options={{ action, appearance, theme: resolvedTheme === "dark" ? "dark" : "light", size: "flexible" }}
      onSuccess={(token) => onToken(token)}
      onExpire={() => onToken(null)}
      onError={() => {
        onToken(null);
        onError?.();
      }}
    />
  );
});
