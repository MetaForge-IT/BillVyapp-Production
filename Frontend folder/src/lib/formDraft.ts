const DRAFT_PREFIX = "salon:draft:";

export function readFormDraft<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(`${DRAFT_PREFIX}${key}`);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

export function writeFormDraft<T>(key: string, value: T): void {
  try {
    sessionStorage.setItem(`${DRAFT_PREFIX}${key}`, JSON.stringify(value));
  } catch {
    // sessionStorage may be unavailable or full
  }
}

export function clearFormDraft(key: string): void {
  try {
    sessionStorage.removeItem(`${DRAFT_PREFIX}${key}`);
  } catch {
    // ignore
  }
}
