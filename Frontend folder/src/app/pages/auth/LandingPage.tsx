import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarCheck,
  Users,
  TrendingUp,
  Package,
  Star,
  ArrowRight,
  CheckCircle2,
  BarChart3,
  Zap,
  Shield,
  Clock,
  CreditCard,
  Bell,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Building2,
  Layers,
  LineChart,
  MessageSquare,
  Sparkles,
  Globe,
  Smartphone,
  Lock,
  Headphones,
  IndianRupee,
  Scissors,
} from "lucide-react";
import { BRAND, SHOW_PUBLIC_SIGNUP } from "../../config/brand";

const features = [
  {
    icon: CalendarCheck,
    title: "Smart Appointments",
    desc: "AI-powered scheduling with real-time slot management and automated reminders.",
    color: "#D4AF37",
  },
  {
    icon: Users,
    title: "Customer CRM",
    desc: "360° client profiles with purchase history, preferences, and loyalty tracking.",
    color: "#00C896",
  },
  {
    icon: TrendingUp,
    title: "Revenue Insights",
    desc: "Live dashboards tracking daily revenue, stylist performance, and growth KPIs.",
    color: "#7C6FCD",
  },
  {
    icon: Package,
    title: "Inventory Control",
    desc: "Auto-reorder alerts, vendor management, and product consumption tracking.",
    color: "#F59E0B",
  },
  {
    icon: CreditCard,
    title: "Seamless Billing",
    desc: "Multi-payment support, GST invoicing, and instant digital receipts.",
    color: "#EF4444",
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    desc: "Granular permissions for admin, manager, stylist, and receptionist roles.",
    color: "#06B6D4",
  },
];

const stats = [
  { value: "2,400+", label: "Salons Managed" },
  { value: "₹48Cr+", label: "Revenue Processed" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "4.9★", label: "Avg. Rating" },
];

const testimonials = [
  {
    name: "Priya Kapoor",
    role: "Owner, Glam Studio · Mumbai",
    text: "BillVyapp transformed how we run our 3 branches. Revenue visibility alone saved us ₹2L/month.",
    avatar: "PK",
    color: "#D4AF37",
  },
  {
    name: "Arjun Mehta",
    role: "Operations Manager · Bangalore",
    text: "The appointment system reduced no-shows by 68%. Staff scheduling is now completely effortless.",
    avatar: "AM",
    color: "#00C896",
  },
  {
    name: "Sneha Reddy",
    role: "CEO, Luxe Chain · Hyderabad",
    text: "We scaled from 2 to 12 outlets in 18 months. BillVyapp's multi-branch control made it possible.",
    avatar: "SR",
    color: "#7C6FCD",
  },
];

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "FAQ", href: "#faq" },
];

const trustedBrands = [
  "The Starr Kuts",
  "Glam Studio",
  "Luxe Chain",
  "UrbanCuts",
  "Bliss Salon",
  "Crown & Co.",
];

const howItWorks = [
  {
    step: "01",
    title: "Onboard in minutes",
    desc: "Import services, staff, and customers. Connect payments and GST settings without technical setup.",
    icon: Sparkles,
  },
  {
    step: "02",
    title: "Run daily operations",
    desc: "Book appointments, manage walk-ins, collect payments, and track inventory from one unified workspace.",
    icon: Layers,
  },
  {
    step: "03",
    title: "Automate client touchpoints",
    desc: "Send reminders, receipts, and follow-ups via WhatsApp & SMS to reduce no-shows and boost retention.",
    icon: MessageSquare,
  },
  {
    step: "04",
    title: "Scale with live intelligence",
    desc: "Monitor revenue, stylist performance, and branch KPIs in real time as you grow from one chair to many.",
    icon: LineChart,
  },
];

const platformHighlights = [
  { icon: Globe, title: "Multi-branch control", desc: "Central dashboard for every outlet, role, and revenue stream." },
  { icon: Smartphone, title: "Mobile-first ops", desc: "Front desk, stylists, and managers work seamlessly on any device." },
  { icon: IndianRupee, title: "India-ready billing", desc: "UPI, cards, GST invoices, advances, and membership billing built in." },
  { icon: Lock, title: "Enterprise security", desc: "Role-based access, audit trails, and 99.9% uptime SLA." },
  { icon: Headphones, title: "Dedicated support", desc: "Onboarding assistance and priority help for growing salon chains." },
  { icon: Building2, title: "Franchise-ready", desc: "Standardize SOPs, pricing, and reporting across all locations." },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "₹2,999",
    period: "/month",
    desc: "Perfect for single-chair salons getting off spreadsheets.",
    features: ["1 branch · up to 5 staff", "Appointments & walk-ins", "Billing & digital receipts", "Customer CRM", "Email support"],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "₹5,999",
    period: "/month",
    desc: "For multi-stylist salons ready to optimize revenue and retention.",
    features: ["Up to 3 branches", "Inventory & vendor management", "Memberships & packages", "Revenue dashboards", "WhatsApp reminders", "Priority support"],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "For franchise groups and high-volume chains with custom workflows.",
    features: ["Unlimited branches", "Dedicated account manager", "Custom integrations", "Advanced permissions", "SLA & onboarding", "API access"],
    cta: "Talk to Sales",
    highlighted: false,
  },
];

const faqs = [
  {
    q: "How long does setup take?",
    a: "Most salons go live in under 10 minutes. Our onboarding wizard guides you through services, staff, and billing configuration step by step.",
  },
  {
    q: "Can BillVyapp handle multiple branches?",
    a: "Yes. Growth and Enterprise plans support multi-branch operations with centralized reporting, role-based access per location, and consolidated revenue views.",
  },
  {
    q: "Does it support GST billing and UPI payments?",
    a: "Absolutely. BillVyapp is built for Indian salons with GST-compliant invoicing, UPI/card collections, advance payments, and instant digital receipts.",
  },
  {
    q: "Is there a free trial?",
    a: "Yes — every plan includes a 14-day free trial with full feature access. No credit card required to get started.",
  },
  {
    q: "Can I migrate from my current software?",
    a: "Our team helps you import customers, services, and product catalogs. Most migrations complete within 1–2 business days.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

export function LandingPage() {
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-[100dvh] bg-[#0A0A0F] text-white overflow-x-hidden safe-area-x">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-[#D4AF37]/[0.07] rounded-full blur-[140px]" />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[#D4AF37]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-[#7C6FCD]/6 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-[#00C896]/4 rounded-full blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      {/* ── NAV ── */}
      <header className="sticky top-0 z-50 h-[76px] border-b border-white/[0.08] bg-[#0A0A0F]/80 backdrop-blur-2xl shadow-[0_1px_0_0_rgba(212,175,55,0.08),0_12px_40px_rgba(0,0,0,0.35)] safe-area-top">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/25 to-transparent" />
        <nav className="relative mx-auto grid h-full max-w-[1440px] grid-cols-[1fr_auto] items-center gap-4 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-12 lg:px-10 xl:px-12">
          {/* Logo */}
          <div className="flex min-w-0 items-center justify-self-start">
            <a href="/" className="group flex items-center leading-none">
              <img
                src={BRAND.platformLogo}
                alt={BRAND.appName}
                className="h-auto w-[168px] max-h-[56px] object-contain object-left transition-all duration-300 drop-shadow-[0_2px_14px_rgba(212,175,55,0.45)] group-hover:drop-shadow-[0_0_36px_rgba(212,175,55,0.65)] sm:w-[188px] sm:max-h-[60px] lg:w-[208px] lg:max-h-[64px]"
              />
            </a>
          </div>

          {/* Centered navigation — desktop */}
          <div className="hidden items-center justify-center gap-6 xl:gap-7 lg:flex">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="relative px-1 py-2 text-[15px] font-medium text-white/75 hover:text-[#D4AF37] transition-colors duration-300 after:absolute after:bottom-1 after:left-0 after:h-px after:w-0 after:bg-[#D4AF37] after:transition-all after:duration-300 hover:after:w-full"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-self-end gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 text-white/80 hover:border-[#D4AF37]/30 hover:bg-white/5 transition-all duration-200"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="inline-flex h-10 items-center rounded-lg border border-white/25 bg-transparent px-5 py-2.5 text-[15px] font-medium text-white/90 hover:border-[#D4AF37]/50 hover:bg-white/[0.05] hover:text-white transition-all duration-300"
            >
              Sign In
            </button>
            {SHOW_PUBLIC_SIGNUP && (
              <button
                type="button"
                onClick={() => navigate("/signup")}
                className="inline-flex h-10 items-center rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#C9A227] px-5 py-2.5 text-[15px] font-semibold text-[#0A0A0F] shadow-[0_4px_22px_rgba(212,175,55,0.3)] hover:shadow-[0_8px_30px_rgba(212,175,55,0.4)] transition-all duration-300 sm:px-6"
              >
                Get Started
              </button>
            )}
          </div>
        </nav>
      </header>

      {/* Mobile navigation drawer */}
      <AnimatePresence>
        {mobileNavOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden safe-area-top">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              className="fixed inset-y-0 right-0 w-[min(100vw-3rem,320px)] bg-[#111118] border-l border-white/10 shadow-2xl flex flex-col safe-area-bottom"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                <img
                  src={BRAND.platformLogo}
                  alt={BRAND.appName}
                  className="h-auto w-[140px] max-h-[40px] object-contain"
                />
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/70 hover:bg-white/5"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-6 space-y-1">
                {navLinks.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    onClick={() => setMobileNavOpen(false)}
                    className="flex items-center justify-between rounded-xl px-4 py-3.5 text-base text-white/80 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    {l.label}
                    <ChevronRight className="h-4 w-4 text-white/30" />
                  </a>
                ))}
              </div>
              <div className="px-5 py-5 border-t border-white/10 space-y-2 safe-area-bottom">
                <button
                  onClick={() => { setMobileNavOpen(false); navigate("/login"); }}
                  className="w-full py-3 rounded-xl border border-white/15 text-sm font-semibold text-white/80 hover:bg-white/5 transition-colors"
                >
                  Sign In
                </button>
                {SHOW_PUBLIC_SIGNUP && (
                  <button
                    onClick={() => { setMobileNavOpen(false); navigate("/signup"); }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#C9A227] text-sm font-semibold text-[#0A0A0F] hover:shadow-lg hover:shadow-[#D4AF37]/25 transition-all"
                  >
                    Get Started Free
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── HERO ── */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-10 xl:px-12 pt-6 sm:pt-8 pb-12 sm:pb-16 text-center safe-area-bottom">
        <div className="pointer-events-none absolute left-1/2 top-8 h-[420px] w-[min(100%,720px)] -translate-x-1/2 rounded-full bg-[#D4AF37]/[0.06] blur-[100px]" />
        <div className="relative mx-auto max-w-[1440px]">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 text-xs font-medium text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/25 px-4 py-1.5 rounded-full mb-5 shadow-[0_0_24px_rgba(212,175,55,0.12)]"
        >
          <Zap className="h-3 w-3" />
          India's #1 Salon & Billing Platform — BillVyapp
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="text-4xl sm:text-5xl lg:text-[4.25rem] lg:leading-[1.05] font-bold tracking-tight max-w-4xl mx-auto"
        >
          Run Your Salon{" "}
          <span className="bg-gradient-to-r from-[#D4AF37] via-[#E8C84A] to-[#C9A227] bg-clip-text text-transparent">
            Like an Empire
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 text-base sm:text-lg text-white/60 max-w-2xl mx-auto leading-relaxed"
        >
          From single chair to multi-branch franchise — BillVyapp gives operations managers
          complete control over appointments, billing, staff, inventory, and growth insights.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.3 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4"
        >
          {SHOW_PUBLIC_SIGNUP && (
            <button
              onClick={() => navigate("/signup")}
              className="group flex w-full sm:w-auto items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold bg-gradient-to-r from-[#D4AF37] to-[#C9A227] text-[#0A0A0F] rounded-xl shadow-[0_8px_32px_rgba(212,175,55,0.28)] hover:shadow-[0_12px_40px_rgba(212,175,55,0.38)] transition-all duration-300 hover:-translate-y-0.5"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
          <button
            onClick={() => navigate("/login")}
            className={`flex w-full sm:w-auto items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold rounded-xl transition-all duration-200 ${
              SHOW_PUBLIC_SIGNUP
                ? "text-white/85 border border-white/15 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/25"
                : "bg-gradient-to-r from-[#D4AF37] to-[#C9A227] text-[#0A0A0F] shadow-[0_8px_32px_rgba(212,175,55,0.28)] hover:shadow-[0_12px_40px_rgba(212,175,55,0.38)] hover:-translate-y-0.5"
            }`}
          >
            Sign In
            <ChevronRight className="h-4 w-4" />
          </button>
        </motion.div>

        {SHOW_PUBLIC_SIGNUP && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-5 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-white/45"
        >
          {["No credit card required", "14-day free trial", "Cancel anytime"].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#00C896]" />
              {t}
            </span>
          ))}
        </motion.div>
        )}

        {/* Stats — integrated into hero */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.6 }}
          className="mt-10 sm:mt-12 mx-auto max-w-4xl rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md px-6 py-7 sm:px-8 shadow-[0_20px_60px_rgba(0,0,0,0.25)]"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-[#D4AF37] to-[#E8C84A] bg-clip-text text-transparent">
                  {s.value}
                </div>
                <div className="mt-1 text-xs sm:text-sm text-white/50">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
        </div>
      </section>

      {/* ── STATS divider removed — now part of hero ── */}
      <div className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 xl:px-12">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      </div>

      {/* ── TRUSTED BY ── */}
      <section className="relative z-10 py-10 sm:py-12">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 xl:px-12">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-white/40 mb-6"
          >
            Trusted by 2,400+ salon operators across India
          </motion.p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 sm:gap-x-12">
            {trustedBrands.map((brand, i) => (
              <motion.span
                key={brand}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                className="text-sm sm:text-base font-semibold text-white/25 hover:text-white/50 transition-colors duration-300"
              >
                {brand}
              </motion.span>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCT PREVIEW ── */}
      <section className="relative z-10 pb-16 sm:pb-20">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 xl:px-12">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto max-w-5xl overflow-hidden rounded-2xl border border-white/[0.1] bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-[0_40px_120px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-center gap-2 border-b border-white/[0.08] bg-black/40 px-4 py-3">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#EF4444]/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#00C896]/80" />
              </div>
              <span className="ml-2 text-[11px] text-white/40">app.billvyapp.com/dashboard</span>
            </div>
            <div className="grid gap-3 p-4 sm:p-6 sm:grid-cols-4">
              {[
                { label: "Today's Revenue", value: "₹24,850", change: "+18%" },
                { label: "Appointments", value: "52", change: "12 pending" },
                { label: "Walk-ins", value: "11", change: "Live queue" },
                { label: "Avg. Ticket", value: "₹1,420", change: "+6%" },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 sm:p-4">
                  <p className="text-[10px] sm:text-[11px] text-white/45 uppercase tracking-wider">{kpi.label}</p>
                  <p className="mt-1 text-lg sm:text-xl font-bold text-white">{kpi.value}</p>
                  <p className="mt-0.5 text-[10px] sm:text-xs text-[#D4AF37]">{kpi.change}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 px-4 pb-4 sm:px-6 sm:pb-6 sm:grid-cols-5">
              <div className="sm:col-span-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-semibold text-white/80">Revenue Trend</p>
                  <span className="text-[10px] text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded-full">This week</span>
                </div>
                <div className="flex items-end gap-1.5 h-24 sm:h-28">
                  {[40, 55, 48, 72, 65, 88, 95].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-md bg-gradient-to-t from-[#C9A227] to-[#D4AF37]"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                <p className="text-sm font-semibold text-white/80 mb-3">Today's Schedule</p>
                <div className="space-y-2">
                  {["10:30 · Hair Color — Priya S.", "11:45 · Bridal Trial — Ananya R.", "2:00 · Keratin — Rohit K."].map((apt) => (
                    <div key={apt} className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-[11px] sm:text-xs text-white/60">
                      <Scissors className="h-3 w-3 text-[#D4AF37] shrink-0" />
                      {apt}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0A0A0F] to-transparent" />
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="relative z-10 py-16 sm:py-20 border-t border-white/[0.06]">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="text-center mb-12 sm:mb-14">
            <motion.p
              custom={0} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
              className="text-sm font-semibold text-[#D4AF37] uppercase tracking-widest mb-3"
            >
              How It Works
            </motion.p>
            <motion.h2
              custom={1} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
              className="text-3xl lg:text-5xl font-bold tracking-tight"
            >
              From Setup to Scale in Four Steps
            </motion.h2>
            <motion.p
              custom={2} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
              className="mt-4 text-white/50 max-w-xl mx-auto"
            >
              BillVyapp is designed like modern SaaS — fast onboarding, unified operations, and intelligence that grows with your business.
            </motion.p>
          </div>
          <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {howItWorks.map((step, i) => (
              <motion.div
                key={step.step}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                className="relative p-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm"
              >
                <span className="text-[11px] font-bold text-[#D4AF37]/60 tracking-widest">{step.step}</span>
                <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20">
                  <step.icon className="h-5 w-5 text-[#D4AF37]" />
                </div>
                <h3 className="mt-4 font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm text-white/45 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="relative z-10 py-16 sm:py-20">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 xl:px-12">
        <div className="text-center mb-12 sm:mb-14">
          <motion.p
            custom={0} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-sm font-semibold text-[#D4AF37] uppercase tracking-widest mb-3"
          >
            Everything You Need
          </motion.p>
          <motion.h2
            custom={1} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-3xl lg:text-5xl font-bold tracking-tight"
          >
            Built for Serious Salon Operators
          </motion.h2>
          <motion.p
            custom={2} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="mt-4 text-white/50 max-w-xl mx-auto"
          >
            Every module crafted around real salon workflows. Zero learning curve, maximum impact.
          </motion.p>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="group relative p-6 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-sm hover:bg-white/[0.06] hover:border-white/[0.14] hover:-translate-y-1 transition-all duration-300 cursor-default shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl mb-4"
                style={{ backgroundColor: `${f.color}15`, border: `1px solid ${f.color}30` }}
              >
                <f.icon className="h-5 w-5" style={{ color: f.color }} />
              </div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-white/45 leading-relaxed">{f.desc}</p>
              <div
                className="absolute bottom-0 left-0 right-0 h-px rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: `linear-gradient(90deg, transparent, ${f.color}60, transparent)` }}
              />
            </motion.div>
          ))}
        </div>
        </div>
      </section>

      {/* ── PLATFORM HIGHLIGHTS ── */}
      <section id="about" className="relative z-10 py-16 sm:py-20 border-t border-white/[0.06]">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-center">
            <div>
              <motion.p
                custom={0} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
                className="text-sm font-semibold text-[#D4AF37] uppercase tracking-widest mb-3"
              >
                Why BillVyapp
              </motion.p>
              <motion.h2
                custom={1} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
                className="text-3xl lg:text-4xl font-bold tracking-tight"
              >
                The Operating System for Modern Salons
              </motion.h2>
              <motion.p
                custom={2} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
                className="mt-4 text-white/50 leading-relaxed"
              >
                Replace disconnected tools, manual registers, and spreadsheet chaos with one platform built for salon economics — from chair utilization to lifetime customer value.
              </motion.p>
              <motion.ul
                custom={3} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
                className="mt-6 space-y-3"
              >
                {["Reduce no-shows by up to 68% with automated reminders", "Process ₹48Cr+ in salon revenue annually on our platform", "Go live in under 10 minutes — no IT team required"].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-white/65">
                    <CheckCircle2 className="h-4 w-4 text-[#00C896] shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </motion.ul>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {platformHighlights.map((item, i) => (
                <motion.div
                  key={item.title}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  className="p-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:border-[#D4AF37]/20 transition-colors duration-300"
                >
                  <item.icon className="h-5 w-5 text-[#D4AF37] mb-3" />
                  <h3 className="font-semibold text-white text-sm">{item.title}</h3>
                  <p className="mt-1.5 text-xs text-white/45 leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="relative z-10 py-16 sm:py-20 border-t border-white/[0.06]">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="text-center mb-12 sm:mb-14">
            <motion.p
              custom={0} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
              className="text-sm font-semibold text-[#D4AF37] uppercase tracking-widest mb-3"
            >
              Pricing
            </motion.p>
            <motion.h2
              custom={1} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
              className="text-3xl lg:text-5xl font-bold tracking-tight"
            >
              Simple, Transparent Plans
            </motion.h2>
            <motion.p
              custom={2} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
              className="mt-4 text-white/50 max-w-xl mx-auto"
            >
              Start free for 14 days. Upgrade as you add staff, branches, and revenue.
            </motion.p>
          </div>
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
            {pricingPlans.map((plan, i) => (
              <motion.div
                key={plan.name}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                className={`relative flex flex-col rounded-2xl border p-6 sm:p-7 ${
                  plan.highlighted
                    ? "border-[#D4AF37]/40 bg-gradient-to-b from-[#D4AF37]/10 to-white/[0.03] shadow-[0_20px_60px_rgba(212,175,55,0.15)]"
                    : "border-white/[0.08] bg-white/[0.03]"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-wider text-[#0A0A0F] bg-gradient-to-r from-[#D4AF37] to-[#C9A227] px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-bold text-white">{plan.price}</span>
                  {plan.period && <span className="text-sm text-white/40">{plan.period}</span>}
                </div>
                <p className="mt-3 text-sm text-white/45">{plan.desc}</p>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-white/65">
                      <CheckCircle2 className="h-4 w-4 text-[#D4AF37] shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => navigate(SHOW_PUBLIC_SIGNUP && plan.name !== "Enterprise" ? "/signup" : "/login")}
                  className={`mt-6 w-full py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    plan.highlighted
                      ? "bg-gradient-to-r from-[#D4AF37] to-[#C9A227] text-[#0A0A0F] shadow-[0_4px_20px_rgba(212,175,55,0.3)] hover:shadow-[0_8px_28px_rgba(212,175,55,0.4)]"
                      : "border border-white/15 text-white/80 hover:border-[#D4AF37]/40 hover:bg-white/[0.04]"
                  }`}
                >
                  {SHOW_PUBLIC_SIGNUP ? plan.cta : "Sign In"}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="relative z-10 py-16 sm:py-20 border-t border-white/[0.06]">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 xl:px-12">
        <div className="text-center mb-12 sm:mb-14">
          <motion.p
            custom={0} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-sm font-semibold text-[#D4AF37] uppercase tracking-widest mb-3"
          >
            Testimonials
          </motion.p>
          <motion.h2
            custom={1} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="text-3xl lg:text-5xl font-bold tracking-tight"
          >
            Trusted by Salon Leaders
          </motion.h2>
        </div>
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="p-6 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm hover:border-[#D4AF37]/20 hover:bg-white/[0.06] transition-all duration-300"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="h-3.5 w-3.5 fill-[#D4AF37] text-[#D4AF37]" />
                ))}
              </div>
              <p className="text-sm text-white/65 leading-relaxed mb-5">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-[#0A0A0F]"
                  style={{ backgroundColor: t.color }}
                >
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{t.name}</div>
                  <div className="text-xs text-white/40">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="relative z-10 py-16 sm:py-20 border-t border-white/[0.06]">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="text-center mb-12 sm:mb-14">
            <motion.p
              custom={0} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
              className="text-sm font-semibold text-[#D4AF37] uppercase tracking-widest mb-3"
            >
              FAQ
            </motion.p>
            <motion.h2
              custom={1} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
              className="text-3xl lg:text-5xl font-bold tracking-tight"
            >
              Questions? We've Got Answers.
            </motion.h2>
          </div>
          <div className="max-w-2xl mx-auto space-y-3">
            {faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <motion.div
                  key={faq.q}
                  custom={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
                  >
                    <span className="text-sm sm:text-base font-medium text-white/85">{faq.q}</span>
                    <ChevronDown className={`h-4 w-4 text-[#D4AF37] shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-4 text-sm text-white/50 leading-relaxed">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative z-10 py-16 sm:py-20">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 xl:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative max-w-3xl mx-auto overflow-hidden text-center p-10 sm:p-12 rounded-3xl bg-gradient-to-br from-[#D4AF37]/12 to-[#7C6FCD]/10 border border-[#D4AF37]/25 shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.12),transparent_55%)]" />
          <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#C9A227] mx-auto mb-6 shadow-xl shadow-[#D4AF37]/25">
            <BarChart3 className="h-6 w-6 text-[#0A0A0F]" />
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold tracking-tight mb-4">
            Ready to Transform Your Salon?
          </h2>
          <p className="text-white/50 mb-8 max-w-lg mx-auto">
            {SHOW_PUBLIC_SIGNUP
              ? "Join 2,400+ salon owners who run smarter operations with BillVyapp. Setup takes under 10 minutes."
              : "Already on BillVyapp? Sign in to manage your salon operations."}
          </p>
          {SHOW_PUBLIC_SIGNUP ? (
            <button
              onClick={() => navigate("/signup")}
              className="group inline-flex items-center gap-2 px-8 py-4 text-base font-semibold bg-gradient-to-r from-[#D4AF37] to-[#C9A227] text-[#0A0A0F] rounded-2xl shadow-xl shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/35 transition-all duration-300 hover:-translate-y-1"
            >
              Create Free Account
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="group inline-flex items-center gap-2 px-8 py-4 text-base font-semibold bg-gradient-to-r from-[#D4AF37] to-[#C9A227] text-[#0A0A0F] rounded-2xl shadow-xl shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/35 transition-all duration-300 hover:-translate-y-1"
            >
              Sign In
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
          )}
          </div>
        </motion.div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-white/[0.06] py-12">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10 xl:px-12">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 mb-10">
            <div className="sm:col-span-2 lg:col-span-1">
              <img src={BRAND.platformLogo} alt={BRAND.appName} className="h-auto w-[140px] max-h-[44px] object-contain opacity-90 mb-4" />
              <p className="text-sm text-white/40 leading-relaxed max-w-xs">
                India's leading salon operations & billing platform. Built for scale, designed for simplicity.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-4">Product</p>
              <ul className="space-y-2.5">
                {["Features", "Pricing", "How It Works", "FAQ"].map((link) => (
                  <li key={link}>
                    <a href={`#${link.toLowerCase().replace(/\s+/g, "-")}`} className="text-sm text-white/40 hover:text-[#D4AF37] transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-4">Company</p>
              <ul className="space-y-2.5">
                {["About", "Testimonials", "Contact", "Privacy"].map((link) => (
                  <li key={link}>
                    <a href={link === "Testimonials" ? "#testimonials" : link === "About" ? "#about" : "#"} className="text-sm text-white/40 hover:text-[#D4AF37] transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            {SHOW_PUBLIC_SIGNUP && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/50 mb-4">Get Started</p>
              <button
                type="button"
                onClick={() => navigate("/signup")}
                className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#C9A227] text-sm font-semibold text-[#0A0A0F] hover:shadow-lg hover:shadow-[#D4AF37]/25 transition-all"
              >
                Start Free Trial
              </button>
              <p className="mt-3 text-xs text-white/30">14-day trial · No credit card</p>
            </div>
            )}
          </div>
          <div className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/30">{BRAND.copyright}</p>
            <div className="flex items-center gap-1 text-xs text-white/30">
              <Bell className="h-3 w-3" />
              <Clock className="h-3 w-3" />
              <span>99.9% uptime SLA</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
