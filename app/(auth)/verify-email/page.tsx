"use client";

import { onAuthStateChanged, sendEmailVerification, type User } from "firebase/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Notice } from "@/components/feedback/Notice";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authErrorMessage, establishSession, safeNext } from "@/lib/client/session";
import { auth } from "@/lib/firebase";

function VerifyEmail() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [message, setMessage] = useState<{ tone: "error" | "success" | "info"; text: string } | null>(null);
  const [loading, setLoading] = useState<"check" | "resend" | null>(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  async function check() {
    if (!user) return;
    setLoading("check");
    setMessage(null);
    try {
      await user.reload();
      if (!auth.currentUser?.emailVerified) {
        setMessage({ tone: "info", text: "Not verified yet. Click the link in the email, then try again." });
        return;
      }
      await establishSession(auth.currentUser, { forceRefresh: true });
      router.replace(next);
      router.refresh();
    } catch (err) {
      setMessage({ tone: "error", text: authErrorMessage(err) });
    } finally {
      setLoading(null);
    }
  }

  async function resend() {
    if (!user) return;
    setLoading("resend");
    setMessage(null);
    try {
      await sendEmailVerification(user, { url: `${window.location.origin}/verify-email` });
      setMessage({ tone: "success", text: "Sent. Check your inbox and spam folder." });
    } catch (err) {
      setMessage({ tone: "error", text: authErrorMessage(err) });
    } finally {
      setLoading(null);
    }
  }

  if (user === undefined) {
    return (
      <AuthCard title="Verify your email">
        <div className="flex justify-center py-6 text-muted-foreground">
          <Spinner className="h-5 w-5" />
        </div>
      </AuthCard>
    );
  }

  if (user === null) {
    return (
      <AuthCard title="Verify your email">
        <Notice tone="info">
          Your email is verified once you&apos;ve clicked the link we sent. <Link href="/login" className="underline">Log in</Link> to continue.
        </Notice>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Check your inbox"
      subtitle={
        <>
          We sent a verification link to <span className="text-foreground">{user.email}</span>.
        </>
      }
      footer={
        <Link href={next} className="text-muted-foreground hover:text-brand-strong">
          Skip for now. You can set up elections but can&apos;t send invitations yet.
        </Link>
      }
    >
      <p className="text-sm leading-relaxed text-muted-foreground">
        Verifying your email keeps VoteNow free of spam. Once you&apos;ve clicked the link, come back here.
      </p>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      <Button className="h-11 w-full" onClick={check} disabled={loading !== null}>
        {loading === "check" && <Spinner />}
        I&apos;ve verified my email
      </Button>
      <Button variant="outline" className="h-11 w-full" onClick={resend} disabled={loading !== null}>
        {loading === "resend" && <Spinner />}
        Resend email
      </Button>
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmail />
    </Suspense>
  );
}
