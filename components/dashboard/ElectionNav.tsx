"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "", label: "Overview" },
  { href: "/ballot", label: "Ballot" },
  { href: "/voters", label: "Voters" },
  { href: "/invitations", label: "Invitations" },
  { href: "/results", label: "Results" },
  { href: "/activity", label: "Activity" },
  { href: "/settings", label: "Settings" },
];

export function ElectionNav({ electionId }: { electionId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/e/${electionId}`;

  return (
    <nav className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <div className="flex min-w-max gap-1 border-b border-border/60">
        {ITEMS.map((item) => {
          const href = `${base}${item.href}`;
          const active = item.href === "" ? pathname === base : pathname.startsWith(href);
          return (
            <Link
              key={item.label}
              href={href}
              className={cn(
                "-mb-px border-b-2 px-3 py-2.5 text-sm transition-colors",
                active
                  ? "border-brand font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
