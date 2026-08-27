import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Calendar,
  ChevronDown,
  Clock,
  CreditCard,
  Headphones,
  Mail,
  MessageCircle,
  Phone,
  Search,
  Users,
  X,
  Zap,
} from "lucide-react";
import {
  financeIconWrap,
  financePanel,
  financePanelHeader,
  financePanelTitle,
} from "./finance/finance-ui";
import { cn } from "../components/ui/utils";

const quickTopics = [
  { icon: Calendar, label: "Appointments", desc: "Booking & scheduling", href: "/appointments" },
  { icon: CreditCard, label: "Revenue Report", desc: "Invoices & payments", href: "/finance" },
  { icon: Users, label: "Staff", desc: "Employees & shifts", href: "/employees" },
  { icon: Zap, label: "Quick start", desc: "Dashboard overview", href: "/" },
];

const faqs = [
  {
    q: "How do I book a new appointment?",
    a: "Go to Appointments from the sidebar, or use the New Appointment quick action on the dashboard. Select the customer, service, stylist, and time slot to confirm.",
    category: "appointments",
  },
  {
    q: "How do I generate an invoice?",
    a: "Use Generate Invoice from Quick Actions, or navigate to Finance → Billing to create a new bill. Add services, apply discounts, and choose a payment method at checkout.",
    category: "billing",
  },
  {
    q: "How do I manage staff schedules?",
    a: "Open Employees from the sidebar to view profiles, attendance, and performance. Use the Shifts tab to assign weekly schedules and track availability.",
    category: "staff",
  },
  {
    q: "How do I track inventory and stock levels?",
    a: "Go to Inventory from the sidebar. Low-stock items are flagged automatically and appear in your notifications when reorder is needed.",
    category: "inventory",
  },
  {
    q: "How do I export reports?",
    a: "Open Finance from the sidebar, choose your date range and filters, then click Export to download CSV, Excel, or PDF reports.",
    category: "reports",
  },
];

const contactOptions = [
  {
    icon: Mail,
    label: "Email Support",
    value: "support@billvyapp.com",
    hint: "Replies within 24 hours",
    href: "mailto:support@billvyapp.com",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+91 80 4567 8900",
    hint: "Mon–Sat, 9 AM – 9 PM IST",
    href: "tel:+918045678900",
  },
  {
    icon: MessageCircle,
    label: "Live Chat",
    value: "Chat with our team",
    hint: "Average wait under 2 min",
    href: "#",
  },
];

export function HelpSupport() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<string | null>(faqs[0].q);

  const filteredFaqs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter(
      faq =>
        faq.q.toLowerCase().includes(q) ||
        faq.a.toLowerCase().includes(q) ||
        faq.category.includes(q),
    );
  }, [query]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-5 max-w-4xl"
    >
      {/* Header */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#D4AF37]">Support Center</p>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-[#1a1a1a] to-[#d4af37] bg-clip-text text-transparent">
          Help & Support
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Find answers or get in touch with our team
        </p>
      </div>

      {/* Support hours banner */}
      <div className="rounded-xl border border-[#D4AF37]/20 bg-gradient-to-r from-[#FFFBEB] via-[#FAF8F2] to-white px-4 py-3.5 flex flex-wrap items-center gap-3">
        <div className={financeIconWrap}>
          <Headphones className="h-4 w-4 text-[#D4AF37]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-[#111118]">We're here to help</p>
          <p className="text-[11px] text-[#3f3f46] mt-0.5 flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-[#D4AF37]" />
            Support hours: Monday – Saturday, 9:00 AM – 9:00 PM IST
          </p>
        </div>
      </div>

      {/* Quick topics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {quickTopics.map((topic, i) => (
          <motion.button
            key={topic.label}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.35 }}
            onClick={() => navigate(topic.href)}
            className="group rounded-xl border border-black/[0.07] bg-white p-4 text-left shadow-sm hover:border-[#D4AF37]/30 hover:shadow-[0_8px_24px_rgba(17,17,24,0.08)] transition-all"
          >
            <div className={cn(financeIconWrap, "mb-3 group-hover:scale-105 transition-transform")}>
              <topic.icon className="h-4 w-4 text-[#D4AF37]" />
            </div>
            <p className="text-[13px] font-semibold text-[#111118]">{topic.label}</p>
            <p className="text-[11px] text-[#52525b] mt-0.5">{topic.desc}</p>
          </motion.button>
        ))}
      </div>

      {/* FAQ */}
      <div className={financePanel}>
        <div className={financePanelHeader}>
          <div className="flex items-center gap-2.5">
            <div className={financeIconWrap}>
              <BookOpen className="h-4 w-4 text-[#D4AF37]" />
            </div>
            <div>
              <p className={financePanelTitle}>Frequently Asked Questions</p>
              <p className="text-[10px] text-[#52525b] mt-0.5">Search or browse common topics</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#52525b] pointer-events-none" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search help articles…"
              className="w-full h-10 pl-10 pr-9 rounded-xl border border-black/[0.08] bg-[#FAF8F2]/60 text-[13px] text-[#111118] placeholder:text-[#52525b] outline-none focus:border-[#D4AF37]/50 focus:ring-2 focus:ring-[#D4AF37]/12 focus:bg-white transition-all"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-black/[0.06] hover:bg-black/[0.1] transition-colors"
                aria-label="Clear search"
              >
                <X className="h-3 w-3 text-[#3f3f46]" />
              </button>
            )}
          </div>

          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredFaqs.length === 0 ? (
                <motion.p
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-8 text-center text-sm text-[#52525b]"
                >
                  No articles match your search. Try different keywords or contact support below.
                </motion.p>
              ) : (
                filteredFaqs.map(faq => {
                  const isOpen = openFaq === faq.q;
                  return (
                    <motion.div
                      key={faq.q}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className={cn(
                        "rounded-xl border transition-all duration-200",
                        isOpen
                          ? "border-[#D4AF37]/25 bg-[#FFFBEB]/50 shadow-sm"
                          : "border-black/[0.06] bg-[#FAF8F2]/40 hover:border-black/[0.1] hover:bg-[#FAF8F2]",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : faq.q)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                        aria-expanded={isOpen}
                      >
                        <span className="text-[13px] font-semibold text-[#111118]">{faq.q}</span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 text-[#D4AF37] transition-transform duration-200",
                            isOpen && "rotate-180",
                          )}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                            className="overflow-hidden"
                          >
                            <p className="px-4 pb-4 text-[13px] text-[#3f3f46] leading-relaxed border-t border-[#D4AF37]/10 pt-3">
                              {faq.a}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className={financePanel}>
        <div className={financePanelHeader}>
          <p className={financePanelTitle}>Contact Us</p>
        </div>
        <div className="p-4 grid gap-3 sm:grid-cols-3">
          {contactOptions.map(({ icon: Icon, label, value, hint, href }) => (
            <a
              key={label}
              href={href}
              className="group flex flex-col rounded-xl border border-black/[0.06] bg-[#FAF8F2]/40 p-4 hover:border-[#D4AF37]/30 hover:bg-[#FFFBEB]/60 hover:shadow-sm transition-all"
            >
              <div className={cn(financeIconWrap, "mb-3 group-hover:scale-105 transition-transform")}>
                <Icon className="h-4 w-4 text-[#D4AF37]" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#52525b]">{label}</p>
              <p className="text-[13px] font-semibold text-[#111118] mt-1">{value}</p>
              <p className="text-[11px] text-[#52525b] mt-1">{hint}</p>
            </a>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
