import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import type { ZodType } from "zod";
import { ZodError } from "zod";
import { BadRequestError } from "../../utils/errors";
import { authenticate } from "./auth.middleware";
import { authController } from "./auth.controller";
import { registrationController } from "./registration.controller";
import { verificationController } from "./verification.controller";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendLoginOtpSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  verifyLoginOtpSchema,
} from "./auth.validators";

const authRouter = Router();

/**
 * Validates `req.body` against a Zod schema and forwards errors to the global handler.
 */
function validateRequest(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.issues.map((issue) => ({
          field: issue.path.length > 0 ? issue.path.join(".") : "body",
          message: issue.message,
        }));

        next(new BadRequestError("Validation failed", errors));
        return;
      }

      next(error);
    }
  };
}

authRouter.post("/register", validateRequest(registerSchema), registrationController.register);

authRouter.get("/verify-email", verificationController.verifyEmailLink);

authRouter.post(
  "/verify-email",
  validateRequest(verifyEmailSchema),
  verificationController.verifyEmail,
);

authRouter.post(
  "/resend-verification",
  validateRequest(resendVerificationSchema),
  verificationController.resendVerification,
);

authRouter.post("/login", validateRequest(loginSchema), authController.login);

authRouter.post(
  "/login/verify-otp",
  validateRequest(verifyLoginOtpSchema),
  authController.verifyLoginOtp,
);

authRouter.post(
  "/login/resend-otp",
  validateRequest(resendLoginOtpSchema),
  authController.resendLoginOtp,
);

authRouter.post("/refresh", authController.refresh);

authRouter.post("/logout", authController.logout);

authRouter.post("/logout-all", authenticate, authController.logoutAll);

authRouter.get("/me", authenticate, authController.me);

authRouter.post(
  "/forgot-password",
  validateRequest(forgotPasswordSchema),
  authController.forgotPassword,
);

authRouter.post(
  "/reset-password",
  validateRequest(resetPasswordSchema),
  authController.resetPassword,
);

export { authRouter };
