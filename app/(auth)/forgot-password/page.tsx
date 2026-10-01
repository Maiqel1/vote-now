"use client";

import { sendPasswordResetEmail } from "firebase/auth";
import Link from "next/link";
import { useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Notice } from "@/components/feedback/Notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { authErrorMessage } from "@/lib/client/session";
import { auth } from "@/lib/firebase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim(), { url: `${window.location.origin}/login` });
      setSent(true);
    } catch (err) {
      const message = authErrorMessage(err);
      if (message === "Incorrect email or password.") setSent(true);
      else setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="We'll email you a link to choose a new one."
      footer={
        <Link href="/login" className="text-brand-strong hover:text-brand-strong">
          ← Back to log in
        </Link>
      }
    >
      {sent ? (
        <Notice tone="success">If an account exists for {email}, a reset link is on its way. Check your inbox and spam folder.</Notice>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <Notice tone="error">{error}</Notice>}
          <Button type="submit" className="h-11 w-full" disabled={loading}>
            {loading && <Spinner />}
            Send reset link
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
