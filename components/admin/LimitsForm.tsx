"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { adminSetElectionLimits } from "@/lib/actions/admin/elections";
import { setUserLimits } from "@/lib/actions/admin/users";
import { LIMIT_CEILINGS, LIMIT_LABELS, type LimitOverrides, type PlanLimits } from "@/lib/plans";
import { useAdminAction } from "./use-admin-action";

export function LimitsForm({
  kind,
  id,
  overrides,
  inherited,
  fields,
}: {
  kind: "user" | "election";
  id: string;
  overrides: LimitOverrides;
  inherited: PlanLimits;
  fields: (keyof PlanLimits)[];
}) {
  const { busy, perform } = useAdminAction();
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((key) => [key, overrides[key] !== undefined ? String(overrides[key]) : ""])),
  );

  function payload(clear: boolean) {
    if (clear) return {};
    return Object.fromEntries(
      Object.entries(values)
        .filter(([, value]) => value.trim() !== "")
        .map(([key, value]) => [key, Number(value)]),
    );
  }

  async function save(clear: boolean) {
    const data = payload(clear);
    const result = await perform(
      () => (kind === "user" ? setUserLimits(id, data) : adminSetElectionLimits(id, data)),
      clear ? "Limits reset to the defaults" : "Limits saved",
    );
    if (result.ok && clear) setValues(Object.fromEntries(fields.map((key) => [key, ""])));
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((key) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={`${kind}-${key}`} className="text-xs">
              {LIMIT_LABELS[key]}
            </Label>
            <Input
              id={`${kind}-${key}`}
              type="number"
              inputMode="numeric"
              min={1}
              max={LIMIT_CEILINGS[key]}
              placeholder={`Default: ${inherited[key].toLocaleString()}`}
              value={values[key]}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Leave a box empty to use the default. {kind === "user" ? "These apply to all of this person's elections." : "These apply to this election only and win over the owner's limits."}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => save(false)} disabled={busy}>
          {busy && <Spinner />}
          Save limits
        </Button>
        {Object.keys(overrides).length > 0 && (
          <Button size="sm" variant="outline" onClick={() => save(true)} disabled={busy}>
            Reset to defaults
          </Button>
        )}
      </div>
    </div>
  );
}
