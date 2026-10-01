"use client";

import { useState } from "react";
import { Notice } from "@/components/feedback/Notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export function VerifyReceipt({ slug }: { slug: string }) {
  const [receipt, setReceipt] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: "success" | "error" | "warning"; text: string } | null>(null);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    const res = await fetch(`/api/e/${slug}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receipt }),
    });
    const data = (await res.json().catch(() => ({}))) as { found?: boolean; error?: string };
    setBusy(false);
    if (!res.ok) setResult({ tone: "error", text: data.error ?? "Something went wrong." });
    else if (data.found) setResult({ tone: "success", text: "Confirmed. A ballot with this receipt was counted in this election." });
    else setResult({ tone: "warning", text: "No ballot matches this receipt. Check for typos. If it's correct, contact the organizers." });
  }

  return (
    <form onSubmit={check} className="surface space-y-5 rounded-2xl p-6 md:p-8">
      <div className="space-y-2">
        <Label htmlFor="receipt">Receipt code</Label>
        <Input
          id="receipt"
          required
          placeholder="XXXX-XXXX-XXXX"
          className="font-mono uppercase tracking-[0.25em]"
          maxLength={16}
          value={receipt}
          onChange={(e) => setReceipt(e.target.value.toUpperCase())}
        />
      </div>
      {result && <Notice tone={result.tone}>{result.text}</Notice>}
      <Button type="submit" className="h-12 w-full rounded-full" disabled={busy}>
        {busy && <Spinner />}
        Check receipt
      </Button>
    </form>
  );
}
