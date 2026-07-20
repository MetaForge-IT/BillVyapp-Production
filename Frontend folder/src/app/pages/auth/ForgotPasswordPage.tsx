import { useState } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, Scissors, ShieldCheck } from "lucide-react";
import { getApiErrorMessage } from "../../../lib/api";
import { authService } from "../../../services/authService";

type Step = "email" | "sent";

export function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setEmailError("Enter a valid email address");
      return;
    }

    setEmailError("");
    setLoading(true);

    try {
      await authService.forgotPassword(email.trim());
      setStep("sent");
    } catch (err) {
      setEmailError(getApiErrorMessage(err, "Unable to process request."));
    } finally {
      setLoading(false);
    }
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
              Account recovery
            </p>
            <h1 className="text-xl font-bold text-white">Reset your password</h1>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          {step === "email" ? (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white">Forgot your password?</h2>
                <p className="mt-2 text-sm text-white/45 leading-relaxed">
                  Enter your work email and we&apos;ll send a secure reset link. The link expires in 1 hour.
                </p>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@billvyapp.com"
                      className="w-full h-12 pl-10 pr-4 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#D4AF37]/50"
                    />
                  </div>
                  {emailError && <p className="text-[11px] text-red-400">{emailError}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 flex items-center justify-center gap-2 text-sm font-semibold bg-gradient-to-r from-[#D4AF37] to-[#C9A227] text-[#0A0A0F] rounded-xl disabled:opacity-60"
                >
                  {loading ? (
                    <div className="h-5 w-5 rounded-full border-2 border-[#0A0A0F]/30 border-t-[#0A0A0F] animate-spin" />
                  ) : (
                    <>
                      Send reset link
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#00C896]/10 border border-[#00C896]/25 mx-auto mb-5">
                <CheckCircle2 className="h-8 w-8 text-[#00C896]" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Check your email</h2>
              <p className="text-sm text-white/45 leading-relaxed mb-4">
                If an account with <span className="text-white/75 font-medium">{email}</span> exists, password reset
                instructions have been sent.
              </p>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-xs text-white/35">
                <ShieldCheck className="h-3.5 w-3.5 text-[#D4AF37]" />
                We never send passwords by email
              </div>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-white/[0.06]">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
