"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "!bg-card !border-border !text-foreground !rounded-xl !shadow-lg",
          description: "!text-muted-foreground",
        },
      }}
    />
  );
}
