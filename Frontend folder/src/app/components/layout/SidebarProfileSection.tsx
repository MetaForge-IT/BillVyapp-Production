import { motion } from "framer-motion";
import { cn } from "../ui/utils";
import { ProfileDropdown } from "./header/ProfileDropdown";
import { useHeaderPanels } from "./header/useHeaderPanels";
import { useNotifications } from "./header/useNotifications";

interface SidebarProfileSectionProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function SidebarProfileSection({ collapsed = false, onNavigate }: SidebarProfileSectionProps) {
  const {
    containerRef,
    closePanel,
    togglePanel,
    isProfileOpen,
  } = useHeaderPanels();

  const { unreadCount } = useNotifications();

  const handleProfileNavigate = () => {
    onNavigate?.();
    closePanel();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.4 }}
      ref={containerRef}
      className={cn(
        "relative z-30 shrink-0 overflow-visible border-t border-[#D4AF37]/12 bg-gradient-to-b from-[#0a0a10]/80 to-black pb-3 pt-2.5",
        collapsed ? "px-1" : "px-2.5",
      )}
    >
      <ProfileDropdown
        variant="sidebar"
        collapsed={collapsed}
        isOpen={isProfileOpen}
        onToggle={() => togglePanel("profile")}
        onClose={closePanel}
        onNavigate={handleProfileNavigate}
        unreadCount={unreadCount}
      />
    </motion.div>
  );
}
