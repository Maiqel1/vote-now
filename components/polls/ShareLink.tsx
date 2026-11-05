"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ShareLink({ code, question }: { code: string; question: string }) {
  const [url, setUrl] = useState(`/p/${code}`);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setUrl(`${window.location.origin}/p/${code}`);
    setCanShare(typeof navigator.share === "function");
  }, [code]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Select the link and copy it yourself.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input readOnly value={url} onFocus={(e) => e.target.select()} className="font-mono text-xs" aria-label="Poll link" />
        <Button type="button" onClick={copy} className="flex-shrink-0">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${question}\n${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Share on WhatsApp
        </a>
        {canShare && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigator.share({ title: question, url }).catch(() => undefined)}
          >
            <Share2 className="h-3.5 w-3.5" />
            More ways to share
          </Button>
        )}
      </div>
    </div>
  );
}
