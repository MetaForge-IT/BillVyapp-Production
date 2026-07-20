import type { ReactNode } from "react";
import { SettingsProvider } from "../../context/SettingsContext";
import { ProductsProvider } from "../../context/ProductsContext";
import { ServiceProductsProvider } from "../../context/ServiceProductsContext";
import { IncentivesProvider } from "../../context/IncentivesContext";
import { AppointmentProvider } from "../../context/AppointmentContext";
import { ReceiptsProvider } from "../../context/ReceiptsContext";
import { PendingPaymentsProvider } from "../../context/PendingPaymentsContext";
import { AdvancesProvider } from "../../context/AdvancesContext";
import { RoleProvider } from "../../context/RoleContext";
import { CouponsProvider } from "../../context/CouponsContext";
import { NotificationsProvider } from "../../context/NotificationsContext";
import { DashboardProvider } from "../../pages/dashboard/useDashboard";

export function ProtectedAppProviders({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <ProductsProvider>
        <ServiceProductsProvider>
          <IncentivesProvider>
            <ReceiptsProvider>
              <PendingPaymentsProvider>
                <AdvancesProvider>
                  <AppointmentProvider>
                    <RoleProvider>
                      <CouponsProvider>
                        <NotificationsProvider>
                          <DashboardProvider>{children}</DashboardProvider>
                        </NotificationsProvider>
                      </CouponsProvider>
                    </RoleProvider>
                  </AppointmentProvider>
                </AdvancesProvider>
              </PendingPaymentsProvider>
            </ReceiptsProvider>
          </IncentivesProvider>
        </ServiceProductsProvider>
      </ProductsProvider>
    </SettingsProvider>
  );
}
