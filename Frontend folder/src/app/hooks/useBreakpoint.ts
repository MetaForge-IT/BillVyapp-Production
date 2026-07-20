import { useEffect, useState } from "react";
import { BREAKPOINTS, getDeviceClass, type DeviceClass } from "../config/responsive";

export interface BreakpointState {
  width: number;
  device: DeviceClass;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** Phone-sized: < 640px */
  isPhone: boolean;
  /** Sidebar layout: >= 768px */
  isSidebarLayout: boolean;
}

function readBreakpoint(): BreakpointState {
  const width = typeof window !== "undefined" ? window.innerWidth : BREAKPOINTS.lg;
  const device = getDeviceClass(width);
  return {
    width,
    device,
    isPhone: width < BREAKPOINTS.sm,
    isMobile: width < BREAKPOINTS.md,
    isTablet: width >= BREAKPOINTS.sm && width < BREAKPOINTS.lg,
    isDesktop: width >= BREAKPOINTS.lg,
    isSidebarLayout: width >= BREAKPOINTS.md,
  };
}

export function useBreakpoint(): BreakpointState {
  const [state, setState] = useState<BreakpointState>(readBreakpoint);

  useEffect(() => {
    const onResize = () => setState(readBreakpoint());
    window.addEventListener("resize", onResize, { passive: true });
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return state;
}
