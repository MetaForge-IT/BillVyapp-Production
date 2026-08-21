import type { ReactNode } from "react";
import { SettingsProvider } from "../../context/SettingsContext";
import { RoleProvider } from "../../context/RoleContext";
import { NotificationsProvider } from "../../context/NotificationsContext";
import { DashboardProvider } from "../../pages/dashboard/useDashboard";

/**
 * Shell-wide providers only — safe on every protected page including Dashboard.
 * Heavy list/finance data belongs in AppDataProviders (route-scoped).
 */
export function ProtectedAppProviders({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <RoleProvider>
        <NotificationsProvider>
          <DashboardProvider>{children}</DashboardProvider>
        </NotificationsProvider>
      </RoleProvider>
    </SettingsProvider>
  );
}
