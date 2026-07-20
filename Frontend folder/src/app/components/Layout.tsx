import { useNavigate, useLocation } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, PanelLeftClose, PanelLeftOpen, Receipt } from "lucide-react";
import { useState, type ReactNode } from "react";
import { EnterpriseSidebar } from "./layout/EnterpriseSidebar";
import { PageBackButton } from "./layout/PageBackButton";
import { BRAND } from "../config/brand";
import { TooltipProvider } from "./ui/tooltip";
import { Toaster } from "./ui/sonner";
import { cn } from "./ui/utils";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { useAppBackNavigation } from "../hooks/useAppBackNavigation";

function HeaderSalonTagline() {
  return (
    <div
      className="inline-flex max-w-full items-center gap-2 rounded-lg border border-[#D4AF37]/18 bg-[#D4AF37]/[0.05] px-2.5 py-1 shadow-[0_0_20px_rgba(212,175,55,0.08)] sm:gap-2.5 sm:px-3 sm:py-1.5 md:px-3.5"
      aria-label={BRAND.clientTagline}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#D4AF37]/22 bg-[#D4AF37]/10 sm:h-7 sm:w-7">
        <Receipt
          className="h-3 w-3 text-[#D4AF37] sm:h-3.5 sm:w-3.5"
          aria-hidden
        />
      </span>
      <span className="min-w-0 border-b border-dashed border-[#D4AF37]/40 pb-0.5 text-[11px] font-bold uppercase leading-tight tracking-[0.06em] sm:text-xs sm:tracking-[0.07em] md:text-sm md:tracking-[0.08em] lg:text-base lg:tracking-[0.09em] font-['Poppins']">
        <span className="bg-gradient-to-r from-[#F5E6B8] via-[#D4AF37] to-[#F5E6B8] bg-clip-text text-transparent">
          {BRAND.clientTagline}
        </span>
      </span>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { isPhone } = useBreakpoint();
  const { showBack, goBack } = useAppBackNavigation();

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-[#f4f2ed]">
            <div
              className={cn(
                "min-h-screen w-full",
                collapsed
                  ? "md:grid md:grid-cols-[68px_minmax(0,1fr)]"
                  : "md:grid md:grid-cols-[260px_minmax(0,1fr)]",
              )}
            >

            {/* ── TABLET / DESKTOP SIDEBAR (md+) ── */}
            <aside
              className={cn(
                "hidden md:sticky md:top-0 md:z-40 md:flex md:h-screen md:flex-col md:shrink-0 md:overflow-visible transition-all duration-300 ease-in-out",
              )}
            >
              <div className="relative flex h-full min-h-0 grow flex-col overflow-visible bg-[#0a0a10] shadow-[6px_0_32px_rgba(0,0,0,0.35)]">
                {/* Collapse toggle */}
                <button
                  type="button"
                  onClick={() => setCollapsed(!collapsed)}
                  className="absolute -right-3 top-[8.5rem] z-50 flex h-6 w-6 items-center justify-center rounded-full bg-[#0a0a10] border border-[#D4AF37]/30 text-[#D4AF37] shadow-md hover:bg-[#D4AF37] hover:text-[#0a0a10] transition-all"
                  aria-label={collapsed ? "Expand" : "Collapse"}
                >
                  {collapsed ? <PanelLeftOpen className="h-3 w-3" /> : <PanelLeftClose className="h-3 w-3" />}
                </button>
                <EnterpriseSidebar collapsed={collapsed} />
              </div>
            </aside>

            {/* ── Main column: header + scrollable content ── */}
            <div className="flex min-h-screen w-full min-w-0 flex-col">
              {/* Mobile / narrow header */}
              <header className="sticky top-0 z-50 grid h-20 shrink-0 grid-cols-[auto_1fr_auto] items-center overflow-visible border-b border-white/[0.08] bg-[#0a0a10] safe-area-top md:hidden">
                <div className="flex shrink-0 items-center gap-2 bg-[#0a0a10] px-3">
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D4AF37]/30 bg-[#0a0a10] text-[#D4AF37]"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  >
                    {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                  </button>
                  {showBack && <PageBackButton onClick={goBack} />}
                </div>
                <div className="flex min-w-0 items-center justify-center px-1 sm:px-2">
                  <HeaderSalonTagline />
                </div>
                <div className="flex min-w-0 shrink items-center justify-end pr-3 sm:pr-5">
                  <img
                    src={BRAND.clientLogo}
                    alt={BRAND.clientName}
                    className="h-auto max-h-[5.25rem] w-auto max-w-[min(100%,9.5rem)] object-contain object-right sm:max-h-[5.5rem] sm:max-w-[min(100%,13rem)]"
                  />
                </div>
              </header>

              {/* Desktop / tablet header (sidebar visible) */}
              <header className="sticky top-0 z-50 hidden h-20 shrink-0 grid-cols-[1fr_auto_1fr] items-center overflow-visible border-b border-white/[0.08] bg-[#0a0a10] safe-area-top md:grid">
                <div className="flex items-center px-4 sm:px-6">
                  {showBack && <PageBackButton onClick={goBack} />}
                </div>
                <div className="flex min-w-0 items-center justify-center px-2">
                  <HeaderSalonTagline />
                </div>
                <div className="flex min-w-0 items-center justify-end px-4 lg:pr-8">
                  <img
                    src={BRAND.clientLogo}
                    alt={BRAND.clientName}
                    className="h-auto max-h-[5.5rem] w-auto max-w-[min(100%,14rem)] object-contain object-right lg:max-h-[6.25rem] lg:max-w-[min(100%,17rem)]"
                  />
                </div>
              </header>

              {/* Page content */}
              <main className="flex-1 min-w-0">
                <div className="mx-auto w-full max-w-[1800px] px-6 py-6 safe-area-bottom lg:px-8">
                  <AnimatePresence mode="wait">
                      <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      >
                        {children}
                      </motion.div>
                  </AnimatePresence>
                </div>
              </main>
            </div>
          </div>

            {/* ── MOBILE MENU (overlay, outside grid) ── */}
            <AnimatePresence>
              {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden safe-area-top">
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={() => setMobileMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
                    transition={{ type: "spring", stiffness: 280, damping: 30 }}
                    className="fixed inset-y-0 left-0 z-50 w-[260px] bg-[#0a0a10] shadow-2xl flex flex-col overflow-visible"
                  >
                    <EnterpriseSidebar onNavigate={() => setMobileMenuOpen(false)} />
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            <Toaster
              richColors
              closeButton
              position={isPhone ? "bottom-center" : "top-right"}
              toastOptions={{ className: "safe-area-x" }}
            />
          </div>
    </TooltipProvider>
  );
}
