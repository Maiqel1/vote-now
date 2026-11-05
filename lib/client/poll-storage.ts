import type { PollChoices } from "@/lib/polls";

const DEVICE_KEY = "vn_device";
const POLLS_KEY = "vn_polls";
const VOTES_KEY = "vn_poll_votes";
const MAX_SAVED = 20;

export interface SavedPoll {
  code: string;
  key: string;
  title: string;
  createdAt: number;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  } catch {}
}

export function storedDeviceId(): string | null {
  try {
    return localStorage.getItem(DEVICE_KEY);
  } catch {
    return null;
  }
}

export function storeDeviceId(id: string): void {
  write(DEVICE_KEY, id);
}

export function savedPolls(): SavedPoll[] {
  const list = read<SavedPoll[]>(POLLS_KEY, []);
  return Array.isArray(list) ? list.filter((p) => p && typeof p.code === "string" && typeof p.key === "string") : [];
}

export function savePoll(poll: SavedPoll): void {
  write(POLLS_KEY, [poll, ...savedPolls().filter((p) => p.code !== poll.code)].slice(0, MAX_SAVED));
}

export function forgetPoll(code: string): void {
  write(POLLS_KEY, savedPolls().filter((p) => p.code !== code));
}

export function savedManageKey(code: string): string | null {
  return savedPolls().find((p) => p.code === code)?.key ?? null;
}

export function myChoices(code: string): PollChoices {
  const mine = read<Record<string, PollChoices>>(VOTES_KEY, {})?.[code];
  return mine && typeof mine === "object" && !Array.isArray(mine) ? mine : {};
}

export function rememberChoices(code: string, choices: PollChoices): void {
  write(VOTES_KEY, { ...read<Record<string, PollChoices>>(VOTES_KEY, {}), [code]: choices });
}
