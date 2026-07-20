import { Outlet } from "react-router";
import { ProtectedAppProviders } from "./ProtectedAppProviders";
import { Layout } from "../Layout";

export function ProtectedAppShell() {
  return (
    <ProtectedAppProviders>
      <Layout>
        <Outlet />
      </Layout>
    </ProtectedAppProviders>
  );
}
