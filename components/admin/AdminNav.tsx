"use client";

import { Activity, AlertTriangle, BarChart3, Mail, Search, Server, Settings, Users, Vote } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin", label: "Overview", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/elections", label: "Elections", icon: Vote },
  { href: "/admin/voters", label: "Voters", icon: Search },
  { href: "/admin/email", label: "Email", icon: Mail },
  { href: "/admin/activity", label: "Activity", icon: Activity },
  { href: "/admin/errors", label: "Errors", icon: AlertTriangle },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/system", label: "System", icon: Server },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin sections" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex flex-shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
              active ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className={cn("h-4 w-4", active ? "text-brand-strong" : "")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
