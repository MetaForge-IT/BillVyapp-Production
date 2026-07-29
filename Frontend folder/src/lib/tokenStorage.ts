/**
 * Thin re-exports for JWT access.
 * Source of truth is the Zustand `useAuthStore` (persisted to localStorage).
 */
export {
  getAccessToken,
  saveAccessToken,
  clearAccessToken,
} from "../stores/authStore";
