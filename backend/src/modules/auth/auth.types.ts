/**
 * Authentication module types — no runtime logic.
 */

export interface JwtPayload {
  sub: string;
  salonId: string;
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
  salonId: string;
  phone: string | null;
  avatarUrl: string | null;
}

export interface AuthContext {
  userId: string;
  salonId: string;
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
