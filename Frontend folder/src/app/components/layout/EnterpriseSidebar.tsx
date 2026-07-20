import { Link, useLocation } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState, useEffect } from "react";
import { enterpriseNavigation, isNavHrefActive, isNavParentActive } from "../../config/navigation";
import { BRAND } from "../../config/brand";
import { cn } from "../ui/utils";
import { SidebarProfileSection } from "./SidebarProfileSection";
import { formatCompactInr, useDashboard } from "../../pages/dashboard/useDashboard";
import {
  Zap,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  Clock,
  MapPin,
  Scissors,
} from "lucide-react";

function isActive(pathname: string, search: string, href: string) {
  return isNavHrefActive(pathname, search, href);
}

export function EnterpriseSidebar({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const location = useLocation();
  const { data, loading } = useDashboard();
  const kpis = data?.businessKpis;

  const quickStats = useMemo(() => {
    const revenue = kpis?.todayRevenue ?? 0;
    const appointments = kpis?.todayAppointments ?? 0;
    const walkIns = kpis?.walkInCount ?? 0;
    const placeholder = loading && !kpis ? "…" : null;

    return [
      {
        label: "Today's Revenue",
        value: placeholder ?? formatCompactInr(revenue),
        icon: TrendingUp,
        to: "/finance?tab=receipts&section=sales",
        accent: "#00C896",
      },
      {
        label: "Today's Appointments",
        value: placeholder ?? String(appointments),
        icon: Zap,
        to: "/appointments",
        accent: "#D4AF37",
      },
      {
        label: "Walk-in Customers",
        value: placeholder ?? String(walkIns),
        icon: Clock,
        to: "/appointments?type=walk-in",
        accent: "#7C6FCD",
      },
    ];
  }, [kpis, loading]);

  const filteredNav = useMemo(() => enterpriseNavigation, []);
  const flatNavItems = useMemo(
    () => filteredNav.flatMap((section) => section.items),
    [filteredNav],
  );
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    filteredNav.forEach(section => {
      section.items.forEach(item => {
        if (item.children?.length && isNavParentActive(location.pathname, item.href)) {
          setExpanded(prev => ({ ...prev, [item.href]: true }));
        }
      });
    });
  }, [location.pathname, filteredNav]);

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#0a0a10]">

      {/* ── Ambient gold glow ── */}
      <div className="pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full bg-[#D4AF37]/[0.07] blur-3xl" />
      <div className="pointer-events-none absolute bottom-32 right-0 h-48 w-48 rounded-full bg-[#D4AF37]/[0.05] blur-2xl" />

      {/* ── Subtle grid texture ── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(212,175,55,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.35) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* ── LOGO ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 shrink-0 flex h-[7.5rem] w-full items-center justify-center px-2"
      >
        {collapsed ? (
          <img
            src={BRAND.platformLogo}
            alt={BRAND.appName}
            className="h-10 w-10 object-contain object-center drop-shadow-[0_0_12px_rgba(212,175,55,0.4)]"
          />
        ) : (
          <motion.img
            src={BRAND.platformLogo}
            alt={BRAND.appName}
            className="h-auto w-full max-w-[200px] max-h-[60px] object-contain object-center drop-shadow-[0_2px_16px_rgba(212,175,55,0.4)]"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        )}
      </motion.div>

      {/* ── Salon branch strip ── */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="relative z-10 shrink-0 mx-3 mb-2.5 overflow-hidden"
          >
            <div className="rounded-xl border border-[#D4AF37]/20 bg-gradient-to-r from-[#D4AF37]/[0.08] to-transparent px-3 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/25">
                  <MapPin className="h-3 w-3 text-[#D4AF37]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-white/90 truncate">{BRAND.clientName}</p>
                  <p className="text-[9px] text-white/40 truncate">Main Branch · Hyderabad</p>
                </div>
                <span className="flex shrink-0 items-center gap-1 rounded-full border border-[#00C896]/25 bg-[#00C896]/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#00C896]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00C896] shadow-[0_0_6px_#00C896] animate-pulse" />
                  Open
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top divider ── */}
      <div className="relative shrink-0 mx-3 mb-2">
        <div className="h-px bg-gradient-to-r from-transparent via-[#D4AF37]/35 to-transparent" />
      </div>

      {/* ── Quick stats (live from dashboard API) ── */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 shrink-0 mx-3 mb-2.5"
          >
            <p className="mb-1.5 px-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/30">Today&apos;s Salon Overview</p>
            <div className="grid grid-cols-3 gap-1.5">
              {quickStats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.06 }}
                >
                  <Link
                    to={s.to}
                    onClick={onNavigate}
                    className="group flex flex-col items-center gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] py-2.5 px-1 hover:border-[#D4AF37]/35 hover:bg-[#D4AF37]/[0.08] transition-all duration-200"
                  >
                    <s.icon className="h-3 w-3 transition-colors" style={{ color: s.accent }} />
                    <span className="text-[12px] font-bold text-white tabular-nums leading-none">{s.value}</span>
                    <span className="px-0.5 text-center text-[8px] font-medium leading-tight text-white/50 line-clamp-2">{s.label}</span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Navigation (pages only, no section headers) ── */}
      <nav className="relative z-10 flex flex-1 flex-col min-h-0 overflow-hidden px-2.5 pb-2">
        <ul className="space-y-0.5">
          {flatNavItems.map((item, ii) => {
                const Icon = item.icon;
                const hasChildren = (item.children?.length ?? 0) > 0;
                const parentActive = hasChildren
                  ? isNavParentActive(location.pathname, item.href)
                  : isActive(location.pathname, location.search, item.href);
                const isExpanded = expanded[item.href] ?? parentActive;
                const hovered = hoveredItem === item.href;

                if (hasChildren) {
                  return (
                    <li key={item.href}>
                      <motion.div
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: ii * 0.04 + 0.1, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      >
                        {collapsed ? (
                          <Link
                            to={item.children![0].href}
                            onClick={onNavigate}
                            title={item.label}
                            className={cn(
                              "group relative flex h-11 w-11 items-center justify-center rounded-xl mx-auto transition-all duration-200",
                              parentActive
                                ? "bg-gradient-to-r from-[#D4AF37]/18 to-[#D4AF37]/06 border border-[#D4AF37]/25"
                                : "border border-transparent hover:bg-white/[0.05]",
                            )}
                          >
                            <Icon className={cn("h-3.5 w-3.5", parentActive ? "text-[#D4AF37]" : "text-white/40")} />
                          </Link>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setExpanded(prev => ({ ...prev, [item.href]: !isExpanded }))}
                              onMouseEnter={() => setHoveredItem(item.href)}
                              onMouseLeave={() => setHoveredItem(null)}
                              className={cn(
                                "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 overflow-hidden",
                                parentActive
                                  ? "bg-gradient-to-r from-[#D4AF37]/20 to-[#D4AF37]/[0.04] border border-[#D4AF37]/30 shadow-[inset_0_1px_0_rgba(212,175,55,0.2),0_4px_16px_rgba(0,0,0,0.2)]"
                                  : "border border-transparent hover:bg-white/[0.05] hover:border-white/[0.08]",
                              )}
                            >
                              {parentActive && (
                                <motion.span
                                  layoutId="active-bar"
                                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full bg-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.8)]"
                                />
                              )}
                              <motion.div
                                animate={parentActive ? { scale: 1.1 } : { scale: 1 }}
                                className={cn(
                                  "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                                  parentActive ? "bg-[#D4AF37]/20" : "bg-white/[0.05] group-hover:bg-white/[0.08]",
                                )}
                              >
                                <Icon className={cn("h-3.5 w-3.5", parentActive ? "text-[#D4AF37]" : "text-white/40 group-hover:text-white/70")} />
                              </motion.div>
                              <span className={cn(
                                "relative z-10 flex-1 truncate text-left text-[13px] font-medium tracking-[-0.01em] transition-all",
                                parentActive ? "font-semibold text-[#D4AF37]" : "text-white/50 group-hover:text-white/80",
                              )}>
                                {item.label}
                              </span>
                              <ChevronDown className={cn(
                                "relative z-10 h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                                isExpanded ? "rotate-180 text-[#D4AF37]" : "text-white/30 group-hover:text-white/50",
                              )} />
                            </button>

                            <AnimatePresence initial={false}>
                              {isExpanded && (
                                <motion.ul
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                  className="overflow-hidden ml-4 mt-0.5 space-y-0.5 border-l border-[#D4AF37]/15 pl-2"
                                >
                                  {item.children!.map(child => {
                                    const childActive = isActive(location.pathname, location.search, child.href);
                                    return (
                                      <li key={child.href}>
                                        <Link
                                          to={child.href}
                                          onClick={onNavigate}
                                          className={cn(
                                            "flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium transition-all duration-200",
                                            childActive
                                              ? "bg-[#D4AF37]/12 text-[#D4AF37] border border-[#D4AF37]/20"
                                              : "text-white/45 hover:bg-white/[0.04] hover:text-white/75 border border-transparent",
                                          )}
                                        >
                                          <span className={cn(
                                            "h-1.5 w-1.5 rounded-full shrink-0",
                                            childActive ? "bg-[#D4AF37] shadow-[0_0_6px_rgba(212,175,55,0.8)]" : "bg-white/20",
                                          )} />
                                          {child.label}
                                        </Link>
                                      </li>
                                    );
                                  })}
                                </motion.ul>
                              )}
                            </AnimatePresence>
                          </>
                        )}
                      </motion.div>
                    </li>
                  );
                }

                const active = parentActive;
                return (
                  <li key={item.href}>
                    <motion.div
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: ii * 0.04 + 0.1, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Link
                        to={item.href}
                        onClick={onNavigate}
                        title={collapsed ? item.label : undefined}
                        onMouseEnter={() => setHoveredItem(item.href)}
                        onMouseLeave={() => setHoveredItem(null)}
                        className={cn(
                          "group relative flex items-center rounded-xl transition-all duration-200 overflow-hidden",
                          collapsed ? "justify-center h-11 w-11 mx-auto" : "gap-3 px-3 py-2.5",
                          active
                            ? "bg-gradient-to-r from-[#D4AF37]/20 to-[#D4AF37]/[0.04] border border-[#D4AF37]/30 shadow-[inset_0_1px_0_rgba(212,175,55,0.2),0_4px_16px_rgba(0,0,0,0.2)]"
                            : "border border-transparent hover:bg-white/[0.05] hover:border-white/[0.08]"
                        )}
                      >
                        {/* Active gold left bar */}
                        {active && (
                          <motion.span
                            layoutId="active-bar"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full bg-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.8)]"
                          />
                        )}

                        {/* Hover shimmer */}
                        {hovered && !active && (
                          <motion.span
                            layoutId="hover-bg"
                            className="absolute inset-0 bg-gradient-to-r from-white/[0.04] to-transparent rounded-xl"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                          />
                        )}

                        {/* Icon */}
                        <motion.div
                          animate={active ? { scale: 1.1 } : { scale: 1 }}
                          transition={{ duration: 0.2 }}
                          className={cn(
                            "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                            active
                              ? "bg-[#D4AF37]/20 shadow-[0_0_12px_rgba(212,175,55,0.25)]"
                              : "bg-white/[0.05] group-hover:bg-white/[0.08]"
                          )}
                        >
                          <Icon className={cn(
                            "h-3.5 w-3.5 shrink-0 transition-all duration-200",
                            active ? "text-[#D4AF37]" : "text-white/40 group-hover:text-white/70"
                          )} />
                        </motion.div>

                        {/* Label */}
                        {!collapsed && (
                          <div className="relative z-10 flex flex-1 items-center justify-between min-w-0">
                            <span className={cn(
                              "truncate font-['Inter',system-ui] transition-all duration-200",
                              active
                                ? "text-[13px] font-semibold text-[#D4AF37] tracking-[-0.01em]"
                                : "text-[13px] font-medium text-white/50 group-hover:text-white/80 tracking-[-0.01em]"
                            )}>
                              {item.label}
                            </span>

                            {active ? (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="h-1.5 w-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_8px_rgba(212,175,55,0.9)] shrink-0"
                              />
                            ) : (
                              <ChevronRight className="h-3 w-3 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0" />
                            )}
                          </div>
                        )}
                      </Link>
                    </motion.div>
                  </li>
                );
          })}
        </ul>
      </nav>

      {/* ── Services footer tag ── */}
      {!collapsed && (
        <div className="relative z-10 shrink-0 mx-3 mb-2 flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5 py-2">
          <Scissors className="h-3 w-3 text-[#D4AF37]/70 shrink-0" />
          <p className="text-[9px] text-white/40 leading-snug">
            <span className="text-white/60 font-semibold">42 services</span> active · GST billing enabled
          </p>
        </div>
      )}

      <SidebarProfileSection collapsed={collapsed} onNavigate={onNavigate} />
    </div>
  );
}
