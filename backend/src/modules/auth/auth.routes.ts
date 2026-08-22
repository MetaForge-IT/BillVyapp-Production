import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { authRateLimiter } from "../../middleware/rateLimit";
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

authRouter.post("/login", authRateLimiter, validateRequest(loginSchema), authController.login);

authRouter.post(
  "/login/verify-otp",
  authRateLimiter,
  validateRequest(verifyLoginOtpSchema),
  authController.verifyLoginOtp,
);

authRouter.post(
  "/login/resend-otp",
  authRateLimiter,
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
