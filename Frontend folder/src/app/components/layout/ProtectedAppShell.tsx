import { Suspense } from "react";
import { Outlet } from "react-router";
import { ProtectedAppProviders } from "./ProtectedAppProviders";
import { Layout } from "../Layout";
import { RouteFallback } from "./RouteFallback";

export function ProtectedAppShell() {
  return (
    <ProtectedAppProviders>
      <Layout>
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </Layout>
    </ProtectedAppProviders>
  );
}
