export interface PlanLimits {
  activeElections: number;
  votersPerElection: number;
  reminderRounds: number;
  invitesPerVoter: number;
  positionsPerElection: number;
  candidatesPerElection: number;
}

export type LimitOverrides = Partial<PlanLimits>;

export const FREE_PLAN: PlanLimits = {
  activeElections: 2,
  votersPerElection: 200,
  reminderRounds: 2,
  invitesPerVoter: 5,
  positionsPerElection: 10,
  candidatesPerElection: 50,
};

export const LIMIT_CEILINGS: PlanLimits = {
  activeElections: 50,
  votersPerElection: 20000,
  reminderRounds: 10,
  invitesPerVoter: 20,
  positionsPerElection: 50,
  candidatesPerElection: 300,
};

export const LIMIT_LABELS: Record<keyof PlanLimits, string> = {
  activeElections: "Active elections",
  votersPerElection: "Voters per election",
  reminderRounds: "Reminder rounds",
  invitesPerVoter: "Emails per voter",
  positionsPerElection: "Positions per election",
  candidatesPerElection: "Candidates per election",
};

export const LIMIT_KEYS = Object.keys(FREE_PLAN) as (keyof PlanLimits)[];

export const EMAIL_CHUNK_SIZE = 50;

export function cleanOverrides(input: unknown): LimitOverrides {
  const result: LimitOverrides = {};
  if (!input || typeof input !== "object") return result;
  for (const key of LIMIT_KEYS) {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value === "number" && Number.isInteger(value) && value > 0) {
      result[key] = Math.min(value, LIMIT_CEILINGS[key]);
    }
  }
  return result;
}

export function resolveLimits(...overrides: (LimitOverrides | null | undefined)[]): PlanLimits {
  return overrides.reduce<PlanLimits>((limits, override) => ({ ...limits, ...cleanOverrides(override) }), { ...FREE_PLAN });
}

export function isCustomPlan(limits: PlanLimits): boolean {
  return LIMIT_KEYS.some((key) => limits[key] !== FREE_PLAN[key]);
}

export function planLabel(limits: PlanLimits): string {
  return isCustomPlan(limits) ? "Custom plan" : "Free plan";
}
