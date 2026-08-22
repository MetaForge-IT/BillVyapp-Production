import { cacheDelete, cacheGet, cacheSet } from "../../services/cache.service";
import { redisConfig } from "../../config/redis.config";

const AUTH_USER_CACHE_PREFIX = "auth:user:";

export type CachedAuthUser = {
  id: string;
  salonId: string | null;
  franchiseId: string | null;
  role: string;
  isActive: boolean;
};

export async function getCachedAuthUser(userId: string): Promise<CachedAuthUser | null> {
  return cacheGet<CachedAuthUser>(`${AUTH_USER_CACHE_PREFIX}${userId}`);
}

export async function setCachedAuthUser(user: CachedAuthUser): Promise<void> {
  await cacheSet(`${AUTH_USER_CACHE_PREFIX}${user.id}`, user, redisConfig.authUserTtlSeconds);
}

export async function invalidateAuthUserCache(userId: string): Promise<void> {
  await cacheDelete(`${AUTH_USER_CACHE_PREFIX}${userId}`);
}

/** Update salonId in cache after franchise primary-shop resolution. */
export async function patchCachedAuthUserSalonId(userId: string, salonId: string): Promise<void> {
  const cached = await getCachedAuthUser(userId);
  if (!cached) return;
  await setCachedAuthUser({ ...cached, salonId });
}
