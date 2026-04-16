import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6">
      {/* Ambient orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[700px] h-[700px] rounded-full bg-amber-500/[0.04] blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/[0.04] blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-[-5%] w-[300px] h-[300px] rounded-full bg-amber-500/[0.03] blur-[60px] pointer-events-none" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9 12L11 14L15 10M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622C17.176 19.29 21 14.591 21 9a12.02 12.02 0 00-.382-3.016z"
                stroke="hsl(224 45% 6%)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="font-playfair text-sm font-semibold tracking-wide text-foreground/80">
            VoteNow
          </span>
        </div>
        <Link
          href="/results"
          className="text-xs text-muted-foreground hover:text-amber-400 transition-colors tracking-wide"
        >
          View Results →
        </Link>
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center max-w-3xl mx-auto">
        {/* Headline */}
        <h1 className="animate-slide-up delay-100 font-playfair font-black leading-[0.9] mb-8">
          <span className="block text-[clamp(4rem,12vw,8rem)] gradient-text">
            Vote
          </span>
          <span className="block text-[clamp(4rem,12vw,8rem)] text-foreground/90">
            Now.
          </span>
        </h1>

        {/* Subtext */}
        <p className="animate-slide-up delay-200 text-muted-foreground text-lg md:text-xl max-w-md mx-auto leading-relaxed mb-12 font-sans">
          Your voice shapes the future. Every vote is a statement, every ballot
          a declaration.
        </p>

        {/* CTAs */}
        <div className="animate-slide-up delay-300 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/vote" className="btn-primary text-sm tracking-wide">
            Get Started
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform group-hover:translate-x-1"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <Link href="/results" className="btn-ghost text-sm tracking-wide">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 20V10M12 20V4M6 20v-6" />
            </svg>
            View Results
          </Link>
        </div>

        {/* Trust bar */}
        <div className="animate-slide-up delay-400 flex items-center justify-center gap-6 mt-16 text-muted-foreground/40">
          <div className="h-px w-12 bg-current" />
          <div className="flex items-center gap-6 text-[10px] tracking-[0.2em] uppercase font-medium">
            <span>Secure</span>
            <span className="w-1 h-1 rounded-full bg-current inline-block" />
            <span>Transparent</span>
            <span className="w-1 h-1 rounded-full bg-current inline-block" />
            <span>Fair</span>
          </div>
          <div className="h-px w-12 bg-current" />
        </div>
      </div>

      {/* Bottom edge accent */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/15 to-transparent" />

      {/* Corner decorations */}
      <div className="absolute top-20 right-10 w-32 h-32 border border-amber-500/8 rounded-full pointer-events-none" />
      <div className="absolute top-28 right-18 w-16 h-16 border border-amber-500/6 rounded-full pointer-events-none" />
      <div className="absolute bottom-16 left-10 w-24 h-24 border border-white/4 rounded-full pointer-events-none" />
    </main>
  );
}
