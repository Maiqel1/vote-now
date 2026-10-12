"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/types";

export function useAdminAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function perform<T>(action: () => Promise<ActionResult<T>>, success?: string): Promise<ActionResult<T>> {
    setBusy(true);
    try {
      const result = await action();
      if (!result.ok) toast.error(result.error);
      else {
        if (success) toast.success(success);
        router.refresh();
      }
      return result;
    } finally {
      setBusy(false);
    }
  }

  return { busy, perform };
}
