import { Outlet } from "react-router";

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <Outlet />
    </div>
  );
}
