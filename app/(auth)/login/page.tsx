"use client";

import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthCard, GoogleIcon, OrDivider } from "@/components/auth/AuthCard";
import { TurnstileField, useTurnstile } from "@/components/auth/TurnstileField";
import { Notice } from "@/components/feedback/Notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { authErrorMessage, establishSessionWithCheck, safeNext } from "@/lib/client/session";
import { auth } from "@/lib/firebase";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<"password" | "google" | null>(null);
  const [waiting, setWaiting] = useState(false);
  const turnstile = useTurnstile();

  async function finish(run: () => Promise<import("firebase/auth").UserCredential>, mode: "password" | "google") {
    setError("");
    setLoading(mode);
    try {
      const credential = await run();
      await establishSessionWithCheck(credential.user, turnstile.check, { onWaiting: () => setWaiting(true) });
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(authErrorMessage(err));
      turnstile.check.reset();
      setWaiting(false);
      setLoading(null);
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to manage your elections."
      footer={
        <>
          New to VoteNow?{" "}
          <Link href={`/signup${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-brand-strong hover:text-brand-strong">
            Create an account
          </Link>
        </>
      }
    >
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        disabled={loading !== null}
        onClick={() => finish(() => signInWithPopup(auth, new GoogleAuthProvider()), "google")}
      >
        {loading === "google" ? <Spinner /> : <GoogleIcon />}
        Continue with Google
      </Button>

      <OrDivider />

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          finish(() => signInWithEmailAndPassword(auth, email.trim(), password), "password");
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-brand-strong">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <TurnstileField
          ref={turnstile.ref}
          action="account"
          appearance="interaction-only"
          onToken={turnstile.onToken}
          onError={turnstile.onError}
        />
        {waiting && !error && (
          <p className="text-center text-xs text-muted-foreground">Finishing a quick security check. If a box appears, tick it to continue.</p>
        )}
        {error && <Notice tone="error">{error}</Notice>}

        <Button type="submit" className="h-11 w-full" disabled={loading !== null}>
          {loading === "password" && <Spinner />}
          Log in
        </Button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
