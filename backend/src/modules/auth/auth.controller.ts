import type { CookieOptions, Request, Response } from "express";
import { authConfig } from "../../config/auth.config";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/errors";
import { AUTH_COOKIE_NAMES, AUTH_ERROR_CODES } from "./auth.constants";
import { authService, type AuthService } from "./auth.service";
import type { AuthContext } from "./auth.types";
import type {
  ForgotPasswordInput,
  LoginInput,
  ResendLoginOtpInput,
  ResetPasswordInput,
  VerifyLoginOtpInput,
} from "./auth.validators";

const REFRESH_COOKIE_PATH = "/api";

export interface AuthenticatedRequest extends Request {
  auth: AuthContext;
}

/**
 * HTTP adapter for authentication endpoints.
 * Orchestrates request/response handling only — no business logic.
 */
export class AuthController {
  constructor(private readonly service: AuthService = authService) {}

  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body = req.body as LoginInput;

    const result = await this.service.login(
      {
        email: body.email,
        password: body.password,
        rememberMe: body.rememberMe,
      },
      getSessionMetadata(req),
    );

    sendSuccess(res, {
      message: result.message,
      data: result,
    });
  });

  verifyLoginOtp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body = req.body as VerifyLoginOtpInput;
    const session = getSessionMetadata(req);

    const result = await this.service.verifyLoginOtp(body.challengeId, body.otp, session);

    setRefreshCookie(res, result.refreshToken, result.rememberMe);

    sendSuccess(res, {
      message: "Login successful",
      data: {
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
        tokenType: result.tokenType,
        user: result.user,
      },
    });
  });

  resendLoginOtp = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body = req.body as ResendLoginOtpInput;
    const result = await this.service.resendLoginOtp(body.challengeId);

    sendSuccess(res, {
      message: result.message,
      data: result,
    });
  });

  refresh = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const rawRefreshToken = getRefreshTokenFromCookie(req);
    const result = await this.service.refresh(rawRefreshToken, getSessionMetadata(req));

    setRefreshCookie(res, result.refreshToken, false);

    sendSuccess(res, {
      message: "Token refreshed",
      data: {
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
        tokenType: result.tokenType,
      },
    });
  });

  logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const rawRefreshToken = getRefreshTokenFromCookie(req, false);

    if (rawRefreshToken) {
      await this.service.logout(rawRefreshToken);
    }

    clearRefreshCookie(res);

    sendSuccess(res, { message: "Logged out successfully" });
  });

  logoutAll = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = getAuthContext(req);

    await this.service.logoutAll(userId);
    clearRefreshCookie(res);

    sendSuccess(res, { message: "Logged out from all devices successfully" });
  });

  me = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = getAuthContext(req);
    const user = await this.service.getCurrentUser(userId);

    sendSuccess(res, {
      message: "Authenticated user retrieved",
      data: { user },
    });
  });

  forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body = req.body as ForgotPasswordInput;

    await this.service.forgotPassword(body.email);

    sendSuccess(res, {
      message: "If an account with that email exists, password reset instructions have been sent",
    });
  });

  resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body = req.body as ResetPasswordInput;

    await this.service.resetPassword(body.token, body.newPassword);

    sendSuccess(res, { message: "Password reset successfully" });
  });
}

export const authController = new AuthController();

function getAuthContext(req: Request): AuthContext {
  const auth = (req as AuthenticatedRequest).auth;

  if (!auth) {
    throw new AppError(401, "Authentication required", {
      code: AUTH_ERROR_CODES.TOKEN_MISSING,
    });
  }

  return auth;
}

function getSessionMetadata(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? undefined,
  };
}

function getRefreshTokenFromCookie(req: Request, required = true): string {
  const rawRefreshToken = req.cookies?.[AUTH_COOKIE_NAMES.REFRESH_TOKEN];

  if (!rawRefreshToken && required) {
    throw new AppError(401, "Refresh token is missing", {
      code: AUTH_ERROR_CODES.REFRESH_TOKEN_INVALID,
    });
  }

  return rawRefreshToken ?? "";
}

function getRefreshCookieOptions(maxAge: number): CookieOptions {
  const options: CookieOptions = {
    httpOnly: true,
    secure: authConfig.refreshCookieSecure,
    sameSite: authConfig.refreshCookieSameSite,
    maxAge,
    // Broad enough that /api/auth/refresh and all /api/* calls can send it
    // through Vite/nginx proxies. Narrower /api/auth path often dropped cookies.
    path: REFRESH_COOKIE_PATH,
  };

  const domain = process.env.REFRESH_COOKIE_DOMAIN?.trim();
  if (domain) {
    options.domain = domain;
  }

  return options;
}

function setRefreshCookie(res: Response, refreshToken: string, rememberMe: boolean): void {
  const duration = rememberMe
    ? authConfig.jwtRefreshRememberExpiresIn
    : authConfig.jwtRefreshExpiresIn;

  res.cookie(
    AUTH_COOKIE_NAMES.REFRESH_TOKEN,
    refreshToken,
    getRefreshCookieOptions(parseDurationToMilliseconds(duration)),
  );
}

function clearRefreshCookie(res: Response): void {
  const options: CookieOptions = {
    httpOnly: true,
    secure: authConfig.refreshCookieSecure,
    sameSite: authConfig.refreshCookieSameSite,
    path: REFRESH_COOKIE_PATH,
  };
  const domain = process.env.REFRESH_COOKIE_DOMAIN?.trim();
  if (domain) {
    options.domain = domain;
  }
  // Also clear legacy path so old cookies cannot stick around after logout.
  res.clearCookie(AUTH_COOKIE_NAMES.REFRESH_TOKEN, options);
  res.clearCookie(AUTH_COOKIE_NAMES.REFRESH_TOKEN, { ...options, path: "/api/auth" });
}

function parseDurationToMilliseconds(duration: string): number {
  const match = /^(\d+)\s*([smhd])$/i.exec(duration.trim());

  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  const unitToMs: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };

  const multiplier = unitToMs[unit];

  if (multiplier === undefined) {
    throw new Error(`Unsupported duration unit: ${unit}`);
  }

  return value * multiplier;
}
