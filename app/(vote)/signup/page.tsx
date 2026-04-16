"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    email: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/register-voter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-6 py-16 overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-amber-500/[0.04] blur-[80px] pointer-events-none" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-5">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M9 12L11 14L15 10M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622C17.176 19.29 21 14.591 21 9a12.02 12.02 0 00-.382-3.016z" stroke="hsl(224 45% 6%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-playfair text-sm font-semibold tracking-wide text-foreground/80 group-hover:text-foreground transition-colors">VoteNow</span>
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {success ? (
          /* Success state */
          <div className="text-center animate-slide-up">
            <div className="flex items-center justify-center mb-8">
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-emerald-400">
                  <path d="M9 12L11 14L15 10M21 12C21 16.971 16.971 21 12 21C7.029 21 3 16.971 3 12C3 7.029 7.029 3 12 3C16.971 3 21 7.029 21 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <h2 className="font-playfair text-3xl font-bold text-foreground mb-3">
              You&apos;re Registered!
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8 max-w-sm mx-auto font-sans">
              Your voting code will be delivered to your email on the morning of the election. Keep an eye on your inbox.
            </p>
            <Link href="/" className="btn-ghost text-sm">← Back to Home</Link>
          </div>
        ) : (
          /* Form */
          <div className="animate-slide-up">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium tracking-widest uppercase mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                Voter Registration
              </div>
              <h1 className="font-playfair text-4xl font-bold text-foreground mb-3">
                Register to Vote
              </h1>
              <p className="text-muted-foreground font-sans text-sm leading-relaxed">
                Fill in your details below to receive your unique voting code.
              </p>
            </div>

            {/* Form card */}
            <div className="glass rounded-2xl p-8">
              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Name row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                      First Name
                    </label>
                    <div className="relative input-glow rounded-xl overflow-hidden">
                      <input
                        name="firstName"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        className="w-full bg-input/60 border border-border text-foreground placeholder:text-muted-foreground/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-colors font-sans"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                      Last Name
                    </label>
                    <div className="relative input-glow rounded-xl overflow-hidden">
                      <input
                        name="lastName"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        className="w-full bg-input/60 border border-border text-foreground placeholder:text-muted-foreground/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-colors font-sans"
                      />
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                    Phone Number
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-4 text-muted-foreground/50">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                      </svg>
                    </div>
                    <input
                      name="phoneNumber"
                      placeholder="+234 000 000 0000"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      className="w-full bg-input/60 border border-border text-foreground placeholder:text-muted-foreground/40 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-colors font-sans"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-4 text-muted-foreground/50">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                      </svg>
                    </div>
                    <input
                      name="email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full bg-input/60 border border-border text-foreground placeholder:text-muted-foreground/40 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 transition-colors font-sans"
                    />
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-red-400 font-sans">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full btn-primary justify-center mt-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                >
                  {isLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Registering...
                    </>
                  ) : (
                    <>
                      Register to Vote
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Footnote */}
            <p className="text-center text-muted-foreground/50 text-xs mt-6 font-sans leading-relaxed">
              Your information is stored securely and used only for election purposes.
            </p>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/15 to-transparent" />
    </main>
  );
}
