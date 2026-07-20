import type { Request, Response } from "express";
import { env } from "../../config/env";
import { sendSuccess } from "../../utils/apiResponse";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/errors";
import { AUTH_ERROR_CODES } from "./auth.constants";
import type { ResendVerificationInput, VerifyEmailInput } from "./auth.validators";
import { verificationService, type VerificationService } from "./verification.service";

/**
 * HTTP adapter for email verification endpoints.
 */
export class VerificationController {
  constructor(private readonly service: VerificationService = verificationService) {}

  verifyEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body = req.body as VerifyEmailInput;

    const result = body.token
      ? await this.service.verifyByLink(body.token)
      : await this.service.verifyByOtp(body.email!, body.otp!);

    sendSuccess(res, {
      message: result.message,
      data: { loginUrl: result.loginUrl },
    });
  });

  verifyEmailLink = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const rawToken = typeof req.query.token === "string" ? req.query.token.trim() : "";

    if (!rawToken) {
      res.redirect(this.buildLoginRedirect("error", "missing_token"));
      return;
    }

    try {
      await this.service.verifyByLink(rawToken);
      res.redirect(this.buildLoginRedirect("verified", "1"));
    } catch (error) {
      const code =
        error instanceof AppError && error.code === AUTH_ERROR_CODES.VERIFICATION_TOKEN_INVALID
          ? "invalid_token"
          : "verification_failed";

      res.redirect(this.buildLoginRedirect("error", code));
    }
  });

  resendVerification = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const body = req.body as ResendVerificationInput;
    const result = await this.service.resendVerification(body.email);

    sendSuccess(res, { message: result.message });
  });

  private buildLoginRedirect(param: "verified" | "error", value: string): string {
    const url = new URL("/login", env.frontendUrl);
    url.searchParams.set(param, value);
    return url.toString();
  }
}

export const verificationController = new VerificationController();
