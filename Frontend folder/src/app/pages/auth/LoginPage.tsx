import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MailWarning,
  Scissors,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { ApiError, getApiErrorMessage } from "../../../lib/api";
import { clearFormDraft, readFormDraft, writeFormDraft } from "../../../lib/formDraft";
import { authService } from "../../../services/authService";
import { isLoginOtpChallenge, type LoginOtpChallengeResponse } from "../../../types/auth";
import { useAuth } from "../../context/AuthContext";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../../components/ui/input-otp";

const LOGIN_DRAFT_KEY = "login";
const RESEND_COOLDOWN_SECONDS = 60;

type LoginStep = "credentials" | "otp";

function readPhoneHint(data: LoginOtpChallengeResponse): string {
  return data.phoneHint || (data as LoginOtpChallengeResponse & { emailHint?: string }).emailHint || "";
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isReady, isAuthenticated, syncAuth } = useAuth();
  const otpInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState(() =>
    readFormDraft(LOGIN_DRAFT_KEY, { email: "", mobileNumber: "", password: "" }),
  );
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");
  const [step, setStep] = useState<LoginStep>("credentials");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [phoneHint, setPhoneHint] = useState("");
  const [otpMessage, setOtpMessage] = useState("");
  const [otp, setOtp] = useState("");
  const [otpResendState, setOtpResendState] = useState<"idle" | "sending" | "sent" | "cooldown">("idle");
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const from =
    searchParams.get("redirect") ||
    (location.state as { from?: string } | null)?.from ||
    "/dashboard";

  useEffect(() => {
    writeFormDraft(LOGIN_DRAFT_KEY, form);
  }, [form]);

  useEffect(() => {
    if (isReady && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [from, isAuthenticated, isReady, navigate]);

  useEffect(() => {
    if (step !== "otp") return;
    const timer = window.setTimeout(() => otpInputRef.current?.focus(), 150);
    return () => window.clearTimeout(timer);
  }, [step, challengeId]);

  useEffect(() => {
    if (resendSecondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setResendSecondsLeft((seconds) => {
        if (seconds <= 1) {
          setOtpResendState("idle");
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendSecondsLeft]);

  const startResendCooldown = useCallback(() => {
    setOtpResendState("cooldown");
    setResendSecondsLeft(RESEND_COOLDOWN_SECONDS);
  }, []);

  const applyOtpChallenge = useCallback((data: LoginOtpChallengeResponse) => {
    setChallengeId(data.challengeId);
    setPhoneHint(readPhoneHint(data));
    setOtpMessage(data.message);
    setDevOtp(data.otp ?? null);
    setOtp("");
    setStep("otp");
    setError("");
    startResendCooldown();
  }, [startResendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setUnverifiedEmail(null);

    if ((!form.email.trim() && !form.mobileNumber.trim()) || !form.password) {
      setError("Please enter your email or mobile number, and password.");
      return;
    }

    const mobileDigits = form.mobileNumber.replace(/\D/g, "");
    if (form.mobileNumber.trim() && mobileDigits.length < 10) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    try {
      const response = await authService.login({
        email: form.email.trim() || undefined,
        mobileNumber: form.mobileNumber.trim() || undefined,
        password: form.password,
      });

      if (isLoginOtpChallenge(response.data)) {
        applyOtpChallenge(response.data);
        return;
      }

      clearFormDraft(LOGIN_DRAFT_KEY);
      syncAuth();
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(form.email.trim());
        setError("Your account hasn't been verified yet.");
      } else {
        setError(getApiErrorMessage(err, "Invalid email, mobile, or password."));
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = useCallback(async () => {
    if (!challengeId) {
      setError("Session expired. Please sign in again.");
      setStep("credentials");
      return false;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code sent to your phone.");
      return false;
    }

    setLoading(true);
    setError("");
    try {
      await authService.verifyLoginOtp(challengeId, otp);
      clearFormDraft(LOGIN_DRAFT_KEY);
      syncAuth();
      navigate(from, { replace: true });
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, "Invalid or expired OTP."));
      return false;
    } finally {
      setLoading(false);
    }
  }, [challengeId, from, navigate, otp, syncAuth]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyOtp();
  };

  const handleResendOtp = async () => {
    if (!challengeId || otpResendState === "sending" || resendSecondsLeft > 0) return;
    setOtpResendState("sending");
    setError("");
    try {
      const response = await authService.resendLoginOtp(challengeId);
      if (response.data) {
        if (response.data.otp) {
          setDevOtp(response.data.otp);
        }
        setPhoneHint(readPhoneHint(response.data));
        setOtpMessage(response.data.message);
        setOtp("");
      }
      setOtpResendState("sent");
      startResendCooldown();
    } catch (err) {
      setOtpResendState("idle");
      setError(getApiErrorMessage(err, "Unable to resend code."));
    }
  };

  const handleResend = async () => {
    if (!unverifiedEmail) return;
    setResendState("sending");
    try {
      await authService.resendVerification(unverifiedEmail);
      setResendState("sent");
    } catch {
      setResendState("idle");
    }
  };

  const backToCredentials = () => {
    setStep("credentials");
    setChallengeId(null);
    setOtp("");
    setDevOtp(null);
    setOtpMessage("");
    setResendSecondsLeft(0);
    setOtpResendState("idle");
    setError("");
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center px-4 py-12">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[450px] h-[450px] bg-[#D4AF37]/6 rounded-full blur-[100px]" />
        <div className="absolute bottom-[10%] right-[15%] w-[350px] h-[350px] bg-[#7C6FCD]/6 rounded-full blur-[90px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/70"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/25">
            {step === "otp" ? (
              <Smartphone className="h-5 w-5 text-[#D4AF37]" />
            ) : (
              <Scissors className="h-5 w-5 text-[#D4AF37]" />
            )}
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37]/80">
              {step === "otp" ? "Secure sign-in · SMS" : "Welcome back"}
            </p>
            <h1 className="text-xl font-bold text-white">
              {step === "otp" ? "Enter verification code" : "Sign in to BillVyapp"}
            </h1>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <AnimatePresence mode="wait">
            {step === "credentials" ? (
              <motion.form
                key="credentials"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-[12px] text-white/55 leading-relaxed">
                    Sign in with your <span className="text-white/80">email or mobile</span>. A{" "}
                    <span className="text-white/80">6-digit code</span> will be sent to your registered
                    mobile for secure login.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="you@salon.com"
                      autoComplete="email"
                      className="w-full h-12 pl-10 pr-4 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#D4AF37]/50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/60 uppercase tracking-wider">
                    Mobile number
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={form.mobileNumber}
                      onChange={(e) => setForm((f) => ({ ...f, mobileNumber: e.target.value }))}
                      placeholder="98765 43210"
                      autoComplete="tel"
                      className="w-full h-12 pl-10 pr-4 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#D4AF37]/50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Password</label>
                    <Link to="/forgot-password" className="text-[11px] text-[#D4AF37]/80 hover:text-[#D4AF37]">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full h-12 pl-10 pr-10 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#D4AF37]/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-400/20 bg-red-500/[0.06] p-3">
                    <p className="text-[11px] text-red-400">{error}</p>
                    {unverifiedEmail && (
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={resendState !== "idle"}
                        className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#D4AF37] hover:text-[#e0c060] disabled:opacity-50"
                      >
                        <MailWarning className="h-3 w-3" />
                        {resendState === "sent"
                          ? "Verification code sent"
                          : resendState === "sending"
                            ? "Sending…"
                            : "Resend verification code"}
                      </button>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 flex items-center justify-center gap-2 text-sm font-semibold bg-gradient-to-r from-[#D4AF37] to-[#C9A227] text-[#0A0A0F] rounded-xl disabled:opacity-60"
                >
                  {loading ? (
                    <div className="h-5 w-5 rounded-full border-2 border-[#0A0A0F]/30 border-t-[#0A0A0F] animate-spin" />
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="otp"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleVerifyOtp}
                className="space-y-5"
              >
                <div className="rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.06] p-3 flex gap-3">
                  <ShieldCheck className="h-5 w-5 text-[#D4AF37] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[12px] text-white/70 leading-relaxed">
                      {otpMessage || "Enter the verification code sent to your phone."}
                    </p>
                    <p className="text-[12px] text-white/90">
                      Sent to{" "}
                      <span className="font-semibold text-[#D4AF37]">{phoneHint || "your phone"}</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="login-otp"
                    className="text-xs font-medium text-white/60 uppercase tracking-wider"
                  >
                    SMS verification code
                  </label>
                  <InputOTP
                    id="login-otp"
                    ref={otpInputRef}
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    containerClassName="justify-center"
                    aria-label="6-digit SMS verification code"
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className="h-12 w-11 border-white/15 bg-white/[0.05] text-white text-lg font-semibold first:rounded-l-xl last:rounded-r-xl data-[active=true]:border-[#D4AF37]/60 data-[active=true]:ring-[#D4AF37]/25"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  <p className="text-[11px] text-white/35 text-center">
                    Check your phone for the text message from BillVyapp
                  </p>
                  {devOtp && (
                    <p className="text-[10px] text-amber-400/80 text-center" data-testid="dev-otp-hint">
                      Dev OTP (Twilio not configured): {devOtp}
                    </p>
                  )}
                </div>

                {error && (
                  <div className="rounded-xl border border-red-400/20 bg-red-500/[0.06] p-3">
                    <p className="text-[11px] text-red-400">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full h-12 flex items-center justify-center gap-2 text-sm font-semibold bg-gradient-to-r from-[#D4AF37] to-[#C9A227] text-[#0A0A0F] rounded-xl disabled:opacity-60"
                >
                  {loading ? (
                    <div className="h-5 w-5 rounded-full border-2 border-[#0A0A0F]/30 border-t-[#0A0A0F] animate-spin" />
                  ) : (
                    <>
                      Verify & sign in
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    onClick={backToCredentials}
                    className="inline-flex items-center gap-1.5 text-[12px] text-white/45 hover:text-white"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={otpResendState === "sending" || resendSecondsLeft > 0}
                    className="text-[12px] font-medium text-[#D4AF37] hover:text-[#e0c060] disabled:opacity-50"
                  >
                    {otpResendState === "sending"
                      ? "Sending…"
                      : resendSecondsLeft > 0
                        ? `Resend in ${resendSecondsLeft}s`
                        : otpResendState === "sent"
                          ? "Resend code"
                          : "Resend SMS code"}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {step === "credentials" && (
            <div className="mt-6 pt-6 border-t border-white/[0.06] text-center">
              <p className="text-sm text-white/40">
                Don&apos;t have an account?{" "}
                <Link to="/signup" className="text-[#D4AF37] hover:text-[#e0c060] font-medium">
                  Create one
                </Link>
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
