import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";
import { AuthProvider } from "./context/AuthContext";
import { router } from "./routes";
import { Toaster } from "./components/ui/hot-toast";
import { useBreakpoint } from "./hooks/useBreakpoint";
import { queryClient } from "../lib/queryClient";

export default function App() {
  const { isPhone } = useBreakpoint();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster
          position={isPhone ? "bottom-center" : "top-right"}
          toastOptions={{ className: "safe-area-x" }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
