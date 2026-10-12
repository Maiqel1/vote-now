import "server-only";

export type Loaded<T> = { ok: true; data: T } | { ok: false; error: string };

function describe(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/FAILED_PRECONDITION|requires an index|index is currently building/i.test(message)) {
    return "A database index for this section is still building. Try again in a few minutes.";
  }
  return "This section couldn't load. Check the Errors page or the server logs.";
}

export async function load<T>(label: string, fn: () => Promise<T>): Promise<Loaded<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    console.error(`[admin] ${label} failed`, error);
    return { ok: false, error: describe(error) };
  }
}
