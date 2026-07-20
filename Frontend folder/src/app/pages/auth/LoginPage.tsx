import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, Scissors, MailWarning, ShieldCheck } from "lucide-react";
import { ApiError, getApiErrorMessage } from "../../../lib/api";
import { clearFormDraft, readFormDraft, writeFormDraft } from "../../../lib/formDraft";
import { authService } from "../../../services/authService";
import { isLoginOtpChallenge } from "../../../types/auth";
import { useAuth } from "../../context/AuthContext";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../../components/ui/input-otp";

const LOGIN_DRAFT_KEY = "login";

type LoginStep = "credentials" | "otp";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isReady, isAuthenticated, syncAuth } = useAuth();
  const [form, setForm] = useState(() =>
    readFormDraft(LOGIN_DRAFT_KEY, { email: "", password: "" }),
  );
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");
  const [step, setStep] = useState<LoginStep>("credentials");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [emailHint, setEmailHint] = useState("");
  const [otp, setOtp] = useState("");
  const [otpResendState, setOtpResendState] = useState<"idle" | "sending" | "sent" | "cooldown">("idle");
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const from =
    searchParams.get("redirect") ||
    (location.state as { from?: string } | null)?.from ||
    "/";

  useEffect(() => {
    writeFormDraft(LOGIN_DRAFT_KEY, form);
  }, [form]);

  useEffect(() => {
    if (isReady && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [from, isAuthenticated, isReady, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setUnverifiedEmail(null);

    if (!form.email || !form.password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const response = await authService.login({
        email: form.email.trim(),
        password: form.password,
      });

      if (isLoginOtpChallenge(response.data)) {
        setChallengeId(response.data.challengeId);
        setEmailHint(response.data.emailHint);
        setDevOtp(response.data.otp ?? null);
        setOtp("");
        setStep("otp");
        setError("");
        return;
      }

      clearFormDraft(LOGIN_DRAFT_KEY);
      syncAuth();
      navigate(from, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(form.email.trim());
        setError("Your email hasn't been verified yet.");
      } else {
        setError(getApiErrorMessage(err, "Invalid email or password."));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!challengeId) {
      setError("Session expired. Please sign in again.");
      setStep("credentials");
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }

    setLoading(true);
    try {
      await authService.verifyLoginOtp(challengeId, otp);
      clearFormDraft(LOGIN_DRAFT_KEY);
      syncAuth();
      navigate(from, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, "Invalid or expired OTP."));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!challengeId || otpResendState === "sending" || otpResendState === "cooldown") return;
    setOtpResendState("sending");
    setError("");
    try {
      const response = await authService.resendLoginOtp(challengeId);
      if (response.data?.otp) {
        setDevOtp(response.data.otp);
        setOtp("");
      }
      setOtpResendState("sent");
      window.setTimeout(() => setOtpResendState("cooldown"), 500);
      window.setTimeout(() => setOtpResendState("idle"), 60_000);
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
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/25">
            <Scissors className="h-5 w-5 text-[#D4AF37]" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37]/80">
              {step === "otp" ? "Two-step verification" : "Welcome back"}
            </p>
            <h1 className="text-xl font-bold text-white">
              {step === "otp" ? "Enter verification code" : "Sign in to BillVyapp"}
            </h1>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          {step === "credentials" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="you@salon.com"
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
                        ? "Verification email sent"
                        : resendState === "sending"
                          ? "Sending…"
                          : "Resend verification email"}
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
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/[0.06] p-3 flex gap-3">
                <ShieldCheck className="h-5 w-5 text-[#D4AF37] shrink-0 mt-0.5" />
                <p className="text-[12px] text-white/70 leading-relaxed">
                  We sent a 6-digit code to{" "}
                  <span className="text-white font-medium">{emailHint || "your email"}</span>.
                  Enter it below to finish signing in.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-white/60 uppercase tracking-wider">
                  One-time password
                </label>
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  containerClassName="justify-center"
                >
                  <InputOTPGroup>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="h-11 w-10 border-white/15 bg-white/[0.05] text-white text-base first:rounded-l-xl last:rounded-r-xl"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                {devOtp && (
                  <p className="text-[10px] text-white/35 text-center" data-testid="dev-otp-hint">
                    Dev OTP: {devOtp}
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
                  disabled={otpResendState === "sending" || otpResendState === "cooldown"}
                  className="text-[12px] font-medium text-[#D4AF37] hover:text-[#e0c060] disabled:opacity-50"
                >
                  {otpResendState === "sending"
                    ? "Sending…"
                    : otpResendState === "sent" || otpResendState === "cooldown"
                      ? "Code sent"
                      : "Resend code"}
                </button>
              </div>
            </form>
          )}

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
