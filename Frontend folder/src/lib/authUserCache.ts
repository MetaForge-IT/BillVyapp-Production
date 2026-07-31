import type { AuthUser } from "../types/auth";

const USER_CACHE_KEY = "salon_auth_user";

export function readCachedAuthUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed?.id || !parsed?.fullName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function cacheAuthUser(user: AuthUser): void {
  try {
    sessionStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
  } catch {
    // ignore quota / private mode
  }
}

export function clearCachedAuthUser(): void {
  try {
    sessionStorage.removeItem(USER_CACHE_KEY);
  } catch {
    // ignore
  }
}
