"use client";

import { useEffect, useRef, useState } from "react";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

interface GoogleIdentity {
  initialize(config: { client_id: string; callback: (response: { credential: string }) => void }): void;
  renderButton(element: HTMLElement, options: Record<string, unknown>): void;
}

type GoogleWindow = Window & { google?: { accounts?: { id?: GoogleIdentity } } };

function loadGoogle(): Promise<GoogleIdentity> {
  return new Promise((resolve, reject) => {
    const ready = () => {
      const id = (window as GoogleWindow).google?.accounts?.id;
      if (id) resolve(id);
      else reject(new Error("Google sign-in unavailable"));
    };
    if ((window as GoogleWindow).google?.accounts?.id) return ready();
    let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", ready);
    script.addEventListener("error", () => reject(new Error("Google sign-in failed to load")));
  });
}

export function GoogleVoteButton({ onCredential }: { onCredential: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    callback.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    loadGoogle()
      .then((google) => {
        if (cancelled || !container.current) return;
        google.initialize({ client_id: CLIENT_ID, callback: (response) => callback.current(response.credential) });
        google.renderButton(container.current, {
          theme: document.documentElement.classList.contains("dark") ? "filled_black" : "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width: Math.min(400, Math.max(200, container.current.offsetWidth)),
        });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  if (!CLIENT_ID) {
    return <p className="text-center text-sm text-muted-foreground">Google sign-in isn&apos;t available right now.</p>;
  }

  return (
    <div className="space-y-2">
      <div ref={container} className="flex min-h-[44px] w-full justify-center" />
      {failed && (
        <p className="text-center text-xs text-muted-foreground">
          Google sign-in didn&apos;t load. Check your connection, or open this link in your phone&apos;s browser instead of an in-app browser.
        </p>
      )}
    </div>
  );
}
