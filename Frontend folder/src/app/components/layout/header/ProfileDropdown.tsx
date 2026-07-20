import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Bell, ChevronDown, ChevronRight, HelpCircle, LogOut, User } from "lucide-react";
import { useRole, roleConfig } from "../../../context/RoleContext";
import { cn } from "../../ui/utils";
import { profileMenuItems } from "./types";
import { useMenuKeyboardNav } from "./useHeaderPanels";
import { authService } from "../../../../services/authService";
import type { AuthUser } from "../../../../types/auth";

function initialsFromName(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

interface ProfileDropdownProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  compact?: boolean;
  variant?: "header" | "sidebar";
  collapsed?: boolean;
  onNavigate?: () => void;
  unreadCount?: number;
}

const panelMotion = {
  initial: { opacity: 0, y: 10, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 8, scale: 0.96 },
  transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
};

const sidebarPanelMotion = {
  initial: { opacity: 0, y: 8, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 6, scale: 0.98 },
  transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
};

const menuIcons: Record<string, typeof User> = {
  profile: User,
  notifications: Bell,
  help: HelpCircle,
  signout: LogOut,
};

const primaryMenuItems = profileMenuItems.filter(item => !item.destructive);
const signOutItem = profileMenuItems.find(item => item.destructive)!;

export function ProfileDropdown({
  isOpen,
  onToggle,
  onClose,
  compact,
  variant = "header",
  collapsed = false,
  onNavigate,
  unreadCount = 0,
}: ProfileDropdownProps) {
  const navigate = useNavigate();
  const { role } = useRole();
  const roleInfo = roleConfig[role];
  const isSidebar = variant === "sidebar";
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    void authService.getCurrentUser().then(setUser);
  }, []);

  const displayName = user?.fullName ?? "User";
  const displayEmail = user?.email ?? "";
  const displayInitials = user ? initialsFromName(user.fullName) : "—";
  const displayShortName = user ? shortName(user.fullName) : "User";

  const handleMenuSelect = (index: number) => {
    const item = profileMenuItems[index];
    if (item.href) {
      navigate(item.href);
      onNavigate?.();
    }
    onClose();
  };

  const { menuRef, onKeyDown, focusedIndex } = useMenuKeyboardNav(
    isOpen,
    profileMenuItems.length,
    onClose,
    handleMenuSelect,
  );

  const handleItemClick = (item: (typeof profileMenuItems)[number]) => {
    if (item.href) {
      navigate(item.href);
      onNavigate?.();
    }
    onClose();
  };

  const getItemIndex = (id: string) => profileMenuItems.findIndex(item => item.id === id);

  const panelPositionClass = isSidebar
    ? collapsed
      ? "bottom-full left-0 mb-2 w-[220px]"
      : "bottom-full left-0 right-0 mb-2 w-full"
    : "right-0 mt-2.5";

  const panelWidthClass = isSidebar ? "" : "w-[min(100vw-2rem,288px)]";
  const motionProps = isSidebar ? sidebarPanelMotion : panelMotion;

  return (
    <div className={cn("relative", isSidebar && "overflow-visible")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="User profile menu"
        title={isSidebar && collapsed ? displayName : undefined}
        className={cn(
          "flex items-center transition-all duration-200",
          isSidebar
            ? cn(
                "group relative w-full max-w-full overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-[#D4AF37]/06 hover:border-[#D4AF37]/20",
                collapsed ? "justify-center p-2" : "gap-2 px-2.5 py-2",
                isOpen && "border-[#D4AF37]/25 bg-[#D4AF37]/08",
              )
            : cn(
                "gap-2.5 rounded-xl border",
                compact ? "h-9 px-1.5" : "pl-1.5 pr-2.5 py-1",
                isOpen
                  ? "border-[#D4AF37]/35 bg-[#D4AF37]/08 shadow-[0_0_0_3px_rgba(212,175,55,0.12)]"
                  : "border-black/[0.08] bg-white/80 hover:bg-white hover:border-black/[0.12] hover:shadow-sm",
              ),
        )}
      >
        {isSidebar && (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-[#D4AF37]/05 via-transparent to-transparent pointer-events-none" />
        )}

        <div className="relative shrink-0">
          <div
            className={cn(
              "flex items-center justify-center rounded-lg font-bold shadow-sm",
              isSidebar
                ? "h-8 w-8 bg-gradient-to-br from-[#D4AF37] to-[#B8962E] text-black text-xs shadow-[0_0_12px_rgba(212,175,55,0.35)]"
                : "h-7 w-7 bg-gradient-to-br from-[#D4AF37] to-[#B8962E] text-[#0d0d14] text-[11px]",
            )}
          >
            {displayInitials}
          </div>
          {isSidebar ? (
            unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[#E07A5F] px-0.5 text-[9px] font-bold text-white ring-2 ring-black shadow-sm">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : (
              <span
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#D4AF37] border-2 border-black shadow-[0_0_6px_rgba(212,175,55,0.8)]"
                aria-hidden
              />
            )
          ) : (
            <span
              className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 border-2 border-white"
              aria-hidden
            />
          )}
        </div>

        {isSidebar ? (
          !collapsed && (
            <>
              <div className="min-w-0 flex-1 relative z-10 text-left overflow-hidden">
                <p className="text-[11px] font-semibold text-white/90 truncate tracking-[-0.01em]">
                  {displayShortName}
                </p>
                <p className="text-[9px] text-[#D4AF37]/70 truncate font-medium leading-tight mt-0.5">
                  {roleInfo.label}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "h-3 w-3 shrink-0 text-white/25 group-hover:text-[#D4AF37] transition-all duration-200 relative z-10",
                  isOpen && "rotate-180 text-[#D4AF37]",
                )}
              />
            </>
          )
        ) : (
          !compact && (
            <>
              <div className="min-w-0 text-left hidden sm:block">
                <p className="text-[12px] font-semibold text-[#111118] leading-tight tracking-[-0.01em] truncate max-w-[120px] lg:max-w-[148px]">
                  <span className="hidden lg:inline">{displayName}</span>
                  <span className="lg:hidden">{displayShortName}</span>
                </p>
                <p className="text-[10px] text-[#9a9a9a] leading-tight mt-0.5 truncate">{roleInfo.label}</p>
              </div>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 shrink-0 text-[#9a9a9a] transition-transform duration-200 hidden sm:block",
                  isOpen && "rotate-180",
                )}
              />
            </>
          )
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            {...motionProps}
            ref={menuRef}
            role="menu"
            aria-label="Profile menu"
            onKeyDown={onKeyDown}
            className={cn(
              "absolute z-[100] overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_24px_64px_rgba(17,17,24,0.14)] backdrop-blur-xl",
              panelPositionClass,
              panelWidthClass,
              isSidebar && "max-h-[min(70vh,420px)] overflow-y-auto",
            )}
          >
            {/* Profile header */}
            <div className="relative border-b border-black/[0.06] bg-gradient-to-br from-[#FAF8F2] via-white to-white px-4 py-4">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#B8962E] text-[#0d0d14] text-sm font-bold shadow-[0_4px_14px_rgba(212,175,55,0.35)]">
                    {displayInitials}
                  </div>
                  <span
                    className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white"
                    aria-hidden
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold text-[#111118] tracking-[-0.02em] truncate">
                    {displayName}
                  </p>
                  <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-2 py-0.5 text-[10px] font-semibold text-[#9a7d20]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
                    {roleInfo.label}
                  </span>
                  {displayEmail ? (
                    <p className="mt-1.5 text-[11px] text-[#9a9a9a] truncate">{displayEmail}</p>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Primary actions */}
            <div className="p-1.5">
              {primaryMenuItems.map(item => {
                const Icon = menuIcons[item.id] ?? User;
                const index = getItemIndex(item.id);
                const isFocused = focusedIndex === index;
                const isNotifications = item.id === "notifications";

                return (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    tabIndex={isFocused ? 0 : -1}
                    onClick={() => handleItemClick(item)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors duration-150",
                      "text-[#111118] hover:bg-[#f4f2ed] focus:bg-[#f4f2ed] focus:outline-none",
                      isFocused && "bg-[#f4f2ed]",
                    )}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-black/[0.05] bg-[#FAF8F2] transition-colors group-hover:border-[#D4AF37]/20 group-hover:bg-[#D4AF37]/10">
                      <Icon className="h-3.5 w-3.5 text-[#6b6b6b] transition-colors group-hover:text-[#D4AF37]" />
                    </div>
                    <span className="flex-1 text-[13px] font-medium">{item.label}</span>
                    {isNotifications && unreadCount > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#E07A5F] px-1.5 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                    <ChevronRight className="h-3.5 w-3.5 text-[#c4c4c4] opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                  </button>
                );
              })}
            </div>

            {/* Sign out */}
            <div className="border-t border-black/[0.06] bg-[#FAF8F2]/50 p-1.5">
              {(() => {
                const index = getItemIndex(signOutItem.id);
                const isFocused = focusedIndex === index;
                const Icon = menuIcons.signout;

                return (
                  <button
                    type="button"
                    role="menuitem"
                    tabIndex={isFocused ? 0 : -1}
                    onClick={() => handleItemClick(signOutItem)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors duration-150",
                      "text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none",
                      isFocused && "bg-red-50",
                    )}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-100 bg-red-50/80 transition-colors group-hover:border-red-200 group-hover:bg-red-100">
                      <Icon className="h-3.5 w-3.5 text-red-500" />
                    </div>
                    <span className="flex-1 text-[13px] font-medium">{signOutItem.label}</span>
                  </button>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
