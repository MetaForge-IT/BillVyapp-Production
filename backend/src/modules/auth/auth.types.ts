/**
 * Authentication module types — no runtime logic.
 */

export interface JwtPayload {
  sub: string;
  salonId: string | null;
  franchiseId: string | null;
  role: string;
  ver: number;
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  salonId: string | null;
  franchiseId: string | null;
  phone: string | null;
  avatarUrl: string | null;
  /** Shop display info for sidebar (null for super_admin). */
  shop?: {
    id: string;
    name: string;
    displayName: string | null;
    city: string | null;
    address: string | null;
    state: string | null;
    pincode: string | null;
    franchiseName: string | null;
  } | null;
}

export interface AuthContext {
  userId: string;
  /** Empty string for platform super_admin (no shop scope). */
  salonId: string;
  franchiseId: string | null;
  role: string;
}

export interface LoginRequest {
  email?: string;
  mobileNumber?: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
  user: AuthUser;
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface SessionMetadata {
  ipAddress?: string;
  userAgent?: string;
}
