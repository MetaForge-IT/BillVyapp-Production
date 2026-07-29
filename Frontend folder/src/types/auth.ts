export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  salonId: string;
  phone: string | null;
  avatarUrl: string | null;
}

export interface RegisterPayload {
  salonName: string;
  fullName: string;
  email: string;
  mobileNumber: string;
  password: string;
  confirmPassword: string;
}

export interface LoginPayload {
  email?: string;
  mobileNumber?: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginSuccessResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
  user: AuthUser;
}

export interface LoginOtpChallengeResponse {
  requiresOtp: true;
  challengeId: string;
  expiresIn: number;
  message: string;
  phoneHint: string;
  /** Dev-only when LOGIN_OTP_RETURN_IN_RESPONSE=true */
  otp?: string;
}

export type LoginResponse = LoginSuccessResponse | LoginOtpChallengeResponse;

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface VerifyEmailResponse {
  loginUrl: string;
}

export function isLoginOtpChallenge(
  data: LoginResponse | undefined,
): data is LoginOtpChallengeResponse {
  return Boolean(data && "requiresOtp" in data && data.requiresOtp);
}
