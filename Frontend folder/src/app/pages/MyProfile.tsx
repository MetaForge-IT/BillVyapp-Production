import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import {
  Calendar,
  Camera,
  ChevronRight,
  Mail,
  MapPin,
  Phone,
  Settings,
  Shield,
  Star,
  User,
} from "lucide-react";
import { useRole, roleConfig } from "../context/RoleContext";
import {
  financeBadgeGold,
  financeGoldBtn,
  financeIconWrap,
  financePanel,
  financePanelHeader,
  financePanelTitle,
  financePrimaryBtn,
} from "./finance/finance-ui";
import { cn } from "../components/ui/utils";
import { authService } from "../../services/authService";
import type { AuthUser } from "../../types/auth";

function initialsFromName(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatMemberSince(_user: AuthUser): string {
  return "Active member";
}

export function MyProfile() {
  const navigate = useNavigate();
  const { role } = useRole();
  const roleInfo = roleConfig[role];
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void authService.getCurrentUser().then((current) => {
      setUser(current);
      setLoading(false);
    });
  }, []);

  const displayName = user?.fullName ?? (loading ? "Loading..." : "User");
  const displayEmail = user?.email ?? "—";
  const displayPhone = user?.phone ?? "—";
  const displayInitials = user ? initialsFromName(user.fullName) : "—";

  const details = useMemo(
    () => [
      { icon: Mail, label: "Email", value: displayEmail },
      { icon: Phone, label: "Phone", value: displayPhone },
      { icon: MapPin, label: "Salon ID", value: user?.salonId ?? "—" },
      { icon: Shield, label: "Role", value: roleInfo.label },
      { icon: Calendar, label: "Member since", value: user ? formatMemberSince(user) : "—" },
    ],
    [displayEmail, displayPhone, roleInfo.label, user],
  );

  const stats = [
    { label: "Account", value: user ? "Active" : "—" },
    { label: "Role", value: roleInfo.emoji },
    { label: "Access", value: "Salon" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-5 max-w-4xl"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">Account</p>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#1a1a1a] to-[#d4af37] bg-clip-text text-transparent">
            My Profile
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            View and manage your account information
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/settings")}
          className={cn(financeGoldBtn, "inline-flex items-center gap-2 shrink-0")}
        >
          <Settings className="h-4 w-4" />
          Account Settings
        </button>
      </div>

      {/* Profile hero */}
      <div className={cn(financePanel, "relative overflow-hidden")}>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />
        <div className="bg-gradient-to-br from-[#FAF8F2] via-white to-white px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative shrink-0 self-start">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B8962E] text-[#0d0d14] text-2xl font-bold shadow-[0_8px_24px_rgba(212,175,55,0.35)]">
                {displayInitials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
              <button
                type="button"
                className="absolute -bottom-1 -left-1 flex h-7 w-7 items-center justify-center rounded-lg border border-black/[0.08] bg-white shadow-sm text-[#3f3f46] hover:text-[#D4AF37] hover:border-[#D4AF37]/30 transition-colors"
                aria-label="Change profile photo"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-[#111118] tracking-[-0.02em]">{displayName}</h2>
              <p className="text-sm text-[#3f3f46] mt-1">{roleInfo.description}</p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className={financeBadgeGold + " inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"}>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
                  {roleInfo.label}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-black/[0.08] bg-white px-2.5 py-1 text-[11px] font-medium text-[#3f3f46]">
                  <Star className="h-3 w-3 text-[#D4AF37]" />
                  {roleInfo.emoji} Salon Staff
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 sm:shrink-0 w-full sm:w-auto">
              {stats.map(stat => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-black/[0.06] bg-white/80 px-3 py-2.5 text-center min-w-[88px]"
                >
                  <p className="text-base font-bold text-[#111118] tabular-nums">{stat.value}</p>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-[#52525b] mt-0.5 leading-tight">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Contact details */}
        <div className={cn(financePanel, "lg:col-span-3")}>
          <div className={financePanelHeader}>
            <div className="flex items-center gap-2.5">
              <div className={financeIconWrap}>
                <User className="h-4 w-4 text-[#D4AF37]" />
              </div>
              <div>
                <p className={financePanelTitle}>Personal Information</p>
                <p className="text-[10px] text-[#52525b] mt-0.5">Your contact and workplace details</p>
              </div>
            </div>
          </div>
          <div className="p-4 grid gap-2.5 sm:grid-cols-2">
            {details.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex items-start gap-3 rounded-xl border border-black/[0.05] bg-[#FAF8F2]/50 px-3.5 py-3 hover:border-[#D4AF37]/20 hover:bg-[#FAF8F2] transition-colors"
              >
                <div className={financeIconWrap}>
                  <Icon className="h-4 w-4 text-[#D4AF37]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#52525b]">{label}</p>
                  <p className="text-[13px] font-medium text-[#111118] mt-0.5 truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="space-y-4 lg:col-span-2">
          <div className={financePanel}>
            <div className={financePanelHeader}>
              <p className={financePanelTitle}>Quick Actions</p>
            </div>
            <div className="p-2">
              {[
                { label: "Update account settings", desc: "Salon profile, security & notifications", href: "/settings" },
                { label: "View notifications", desc: "Alerts and activity updates", href: "/notifications" },
                { label: "Get help", desc: "FAQs and support contact", href: "/help" },
              ].map(item => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => navigate(item.href)}
                  className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[#FAF8F2] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-[#111118]">{item.label}</p>
                    <p className="text-[11px] text-[#52525b] mt-0.5">{item.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#c4c4c4] group-hover:text-[#D4AF37] group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#FFFBEB] to-[#FAF8F2] p-4">
            <div className="flex items-start gap-3">
              <div className={financeIconWrap}>
                <Shield className="h-4 w-4 text-[#D4AF37]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[#111118]">Account secured</p>
                <p className="text-[11px] text-[#3f3f46] mt-1 leading-relaxed">
                  Your session is protected with JWT authentication.
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/settings")}
                  className={cn(financePrimaryBtn, "mt-3")}
                >
                  Security settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
