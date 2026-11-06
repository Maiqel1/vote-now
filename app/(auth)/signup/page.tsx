"use client";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
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

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<"password" | "google" | null>(null);
  const [waiting, setWaiting] = useState(false);
  const turnstile = useTurnstile();
  const onWaiting = () => setWaiting(true);

  function fail(err: unknown) {
    setError(authErrorMessage(err));
    turnstile.check.reset();
    setWaiting(false);
    setLoading(null);
  }

  async function signUpWithPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    setError("");
    setLoading("password");
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(credential.user, { displayName: name.trim() });
      await sendEmailVerification(credential.user, { url: `${window.location.origin}/verify-email` });
      await establishSessionWithCheck(credential.user, turnstile.check, { displayName: name.trim(), onWaiting });
      router.replace(`/verify-email?next=${encodeURIComponent(next)}`);
      router.refresh();
    } catch (err) {
      fail(err);
    }
  }

  async function signUpWithGoogle() {
    setError("");
    setLoading("google");
    try {
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      await establishSessionWithCheck(credential.user, turnstile.check, { onWaiting });
      router.replace(next);
      router.refresh();
    } catch (err) {
      fail(err);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Free to start. Run your first election in minutes."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-brand-strong hover:text-brand-strong">
            Log in
          </Link>
        </>
      }
    >
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full"
        disabled={loading !== null}
        onClick={signUpWithGoogle}
      >
        {loading === "google" ? <Spinner /> : <GoogleIcon />}
        Sign up with Google
      </Button>

      <OrDivider />

      <form className="space-y-4" onSubmit={signUpWithPassword}>
        <div className="space-y-2">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" autoComplete="name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground/70">At least 8 characters.</p>
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
          Create account
        </Button>
        <p className="text-center text-xs text-muted-foreground/70">
          We&apos;ll email you a link to verify your address before you can send voter invitations.
        </p>
      </form>
    </AuthCard>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
