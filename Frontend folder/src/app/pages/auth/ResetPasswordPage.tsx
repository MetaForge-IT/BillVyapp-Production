import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Lock, Scissors } from "lucide-react";
import { authService } from "../../../services/authService";
import { getApiErrorMessage } from "../../../lib/api";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid or missing reset link. Please request a new password reset email.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to reset password."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#0A0A0F] flex items-center justify-center px-4 py-10 safe-area-x">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/25">
            <Scissors className="h-5 w-5 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Reset password</h1>
            <p className="text-sm text-white/45">Choose a new secure password</p>
          </div>
        </div>

        {done ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-12 w-12 text-[#00C896] mx-auto mb-4" />
            <p className="text-white font-medium">Password updated successfully</p>
            <p className="text-sm text-white/45 mt-2">You can now sign in with your new password.</p>
            <button
              type="button"
              onClick={() => navigate("/login?reset=1")}
              className="mt-6 w-full h-11 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C9A227] text-sm font-semibold text-[#0A0A0F]"
            >
              Continue to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/60 uppercase tracking-wider">New password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 pl-10 pr-12 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#D4AF37]/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Confirm password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-12 pl-10 pr-12 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#D4AF37]/50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">{error}</p>
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
                  Update password
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-white/35">
          <Link to="/login" className="text-[#D4AF37] hover:text-[#E8C84A]">Back to sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
