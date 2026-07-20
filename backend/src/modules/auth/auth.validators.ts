import { z } from "zod";

/**
 * Shared email validation for authentication requests.
 */
export const emailSchema = z
  .string({ message: "Email is required" })
  .trim()
  .min(1, "Email is required")
  .email("Invalid email format");

/**
 * Strong password rules for reset and change-password flows.
 * Requires minimum length plus uppercase, lowercase, and numeric characters.
 */
export const passwordSchema = z
  .string({ message: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

/** Login password rule — length only (credential check happens in the service). */
const loginPasswordSchema = z
  .string({ message: "Password is required" })
  .min(8, "Password must be at least 8 characters");

/**
 * Validates manager login credentials.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: loginPasswordSchema,
  rememberMe: z.boolean().optional(),
});

export const verifyLoginOtpSchema = z.object({
  challengeId: z
    .string({ message: "Challenge ID is required" })
    .trim()
    .uuid("Invalid challenge ID"),
  otp: z
    .string({ message: "OTP is required" })
    .trim()
    .regex(/^\d{6}$/, "OTP must be a 6-digit code"),
});

export const resendLoginOtpSchema = z.object({
  challengeId: z
    .string({ message: "Challenge ID is required" })
    .trim()
    .uuid("Invalid challenge ID"),
});

/**
 * Placeholder for refresh — V1 reads the refresh token from cookie/header, not body.
 */
export const refreshTokenSchema = z.object({}).strict();

/**
 * Validates forgot-password email submission.
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/**
 * Validates password reset with a one-time token.
 */
export const resetPasswordSchema = z.object({
  token: z.string({ message: "Reset token is required" }).min(1, "Reset token is required"),
  newPassword: passwordSchema,
});

/**
 * Validates authenticated password change (future-ready).
 */
export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ message: "Current password is required" })
    .min(1, "Current password is required"),
  newPassword: passwordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyLoginOtpInput = z.infer<typeof verifyLoginOtpSchema>;
export type ResendLoginOtpInput = z.infer<typeof resendLoginOtpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

const mobileNumberSchema = z
  .string({ message: "Mobile number is required" })
  .trim()
  .min(10, "Mobile number must be at least 10 digits")
  .max(20, "Mobile number is too long")
  .regex(/^[0-9+\-\s()]+$/, "Mobile number contains invalid characters");

/**
 * Validates salon manager self-registration.
 */
export const registerSchema = z
  .object({
    salonName: z
      .string({ message: "Salon name is required" })
      .trim()
      .min(2, "Salon name must be at least 2 characters")
      .max(200, "Salon name is too long"),
    fullName: z
      .string({ message: "Full name is required" })
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(200, "Full name is too long"),
    email: emailSchema,
    mobileNumber: mobileNumberSchema,
    password: passwordSchema,
    confirmPassword: z.string({ message: "Confirm password is required" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * Validates email verification via link token or OTP.
 */
export const verifyEmailSchema = z
  .object({
    token: z.string().trim().min(1).optional(),
    email: emailSchema.optional(),
    otp: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "OTP must be a 6-digit code")
      .optional(),
  })
  .refine((data) => Boolean(data.token) || (Boolean(data.email) && Boolean(data.otp)), {
    message: "Provide either a verification token or email with OTP",
    path: ["token"],
  });

/**
 * Validates resend verification email requests.
 */
export const resendVerificationSchema = z.object({
  email: emailSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
