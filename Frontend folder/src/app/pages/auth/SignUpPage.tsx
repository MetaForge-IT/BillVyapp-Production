import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  Scissors,
  User,
} from "lucide-react";
import { getApiErrorMessage } from "../../../lib/api";
import { clearFormDraft, readFormDraft, writeFormDraft } from "../../../lib/formDraft";
import { authService } from "../../../services/authService";

type Step = "form" | "sent";

const SIGNUP_DRAFT_KEY = "signup";

const initialForm = {
  salonName: "",
  fullName: "",
  email: "",
  mobileNumber: "",
  password: "",
  confirmPassword: "",
};

export function SignUpPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(() =>
    readFormDraft<{ step?: Step }>(SIGNUP_DRAFT_KEY, {}).step ?? "form",
  );
  const [form, setForm] = useState(() => readFormDraft(SIGNUP_DRAFT_KEY, initialForm));
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  useEffect(() => {
    writeFormDraft(SIGNUP_DRAFT_KEY, { ...form, step });
  }, [form, step]);

  const validate = (): string | null => {
    if (!form.salonName || !form.fullName || !form.email || !form.mobileNumber || !form.password) {
      return "Please fill in all fields.";
    }
    if (!/\S+@\S+\.\S+/.test(form.email)) return "Enter a valid email address.";
    if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      return "Password must be 8+ characters with an uppercase letter, a lowercase letter, and a number.";
    }
    if (form.password !== form.confirmPassword) return "Passwords do not match.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setLoading(true);
    try {
      await authService.register(form);
      clearFormDraft(SIGNUP_DRAFT_KEY);
      setStep("sent");
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to create your account."));
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
              Get started
            </p>
            <h1 className="text-xl font-bold text-white">Create your salon account</h1>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          {step === "form" ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Salon name</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <input
                    value={form.salonName}
                    onChange={update("salonName")}
                    placeholder="The Starr Kuts"
                    className="w-full h-12 pl-10 pr-4 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#D4AF37]/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Your full name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <input
                    value={form.fullName}
                    onChange={update("fullName")}
                    placeholder="Vikram Malhotra"
                    className="w-full h-12 pl-10 pr-4 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#D4AF37]/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={update("email")}
                    placeholder="you@salon.com"
                    className="w-full h-12 pl-10 pr-4 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#D4AF37]/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Mobile number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <input
                    value={form.mobileNumber}
                    onChange={update("mobileNumber")}
                    placeholder="+91 98765 43210"
                    className="w-full h-12 pl-10 pr-4 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#D4AF37]/50"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={update("password")}
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
                <p className="text-[10.5px] text-white/25">8+ characters, with an uppercase letter, a lowercase letter, and a number.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Confirm password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.confirmPassword}
                    onChange={update("confirmPassword")}
                    placeholder="••••••••"
                    className="w-full h-12 pl-10 pr-4 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#D4AF37]/50"
                  />
                </div>
              </div>

              {error && <p className="text-[11px] text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 flex items-center justify-center gap-2 text-sm font-semibold bg-gradient-to-r from-[#D4AF37] to-[#C9A227] text-[#0A0A0F] rounded-xl disabled:opacity-60"
              >
                {loading ? (
                  <div className="h-5 w-5 rounded-full border-2 border-[#0A0A0F]/30 border-t-[#0A0A0F] animate-spin" />
                ) : (
                  <>
                    Create account
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <p className="text-center text-sm text-white/40">
                Already have an account?{" "}
                <Link to="/login" className="text-[#D4AF37] hover:text-[#e0c060] font-medium">
                  Sign in
                </Link>
              </p>
            </form>
          ) : (
            <div className="text-center py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#00C896]/10 border border-[#00C896]/25 mx-auto mb-5">
                <CheckCircle2 className="h-8 w-8 text-[#00C896]" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Verify your email</h2>
              <p className="text-sm text-white/45 leading-relaxed mb-6">
                We sent a verification link and OTP to{" "}
                <span className="text-white/75 font-medium">{form.email}</span>. Verify your email to activate your
                account, then sign in.
              </p>
              <button
                onClick={() => navigate("/login")}
                className="w-full h-11 flex items-center justify-center gap-2 text-sm font-semibold bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-xl transition-colors"
              >
                Go to sign in
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
