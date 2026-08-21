import { Outlet } from "react-router";
import { ProductsProvider } from "../../context/ProductsContext";
import { ServiceProductsProvider } from "../../context/ServiceProductsContext";
import { IncentivesProvider } from "../../context/IncentivesContext";
import { AppointmentProvider } from "../../context/AppointmentContext";
import { ReceiptsProvider } from "../../context/ReceiptsContext";
import { PendingPaymentsProvider } from "../../context/PendingPaymentsContext";
import { AdvancesProvider } from "../../context/AdvancesContext";
import { CouponsProvider } from "../../context/CouponsContext";

/**
 * Route-scoped providers for appointments, billing/finance, inventory, and CRM flows.
 * Not mounted on Dashboard — avoids invoices/pending/appointments fetches there.
 */
export function AppDataProviders() {
  return (
    <ProductsProvider>
      <ServiceProductsProvider>
        <IncentivesProvider>
          <ReceiptsProvider>
            <PendingPaymentsProvider>
              <AdvancesProvider>
                <AppointmentProvider>
                  <CouponsProvider>
                    <Outlet />
                  </CouponsProvider>
                </AppointmentProvider>
              </AdvancesProvider>
            </PendingPaymentsProvider>
          </ReceiptsProvider>
        </IncentivesProvider>
      </ServiceProductsProvider>
    </ProductsProvider>
  );
}
