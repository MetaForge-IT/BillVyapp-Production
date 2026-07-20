import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  getBackFallbackPath,
  isSidebarDirectPage,
  shouldShowPageBack,
} from "../config/navigation";

const MAX_STACK = 40;

/**
 * In-app back navigation for subpages only.
 * Sidebar top-level pages never show Back; stack resets when you land on them.
 * Subpages (e.g. /appointments/new) show Back and return to the previous SPA page.
 */
export function useAppBackNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const stackRef = useRef<string[]>([]);
  const indexRef = useRef(-1);
  const poppingRef = useRef(false);
  const [, setTick] = useState(0);

  const fullPath = `${location.pathname}${location.search}`;
  const onSidebarPage = isSidebarDirectPage(location.pathname);

  useEffect(() => {
    const stack = stackRef.current;
    let idx = indexRef.current;

    // Sidebar / top-level pages: no history trail — Back must not appear
    if (onSidebarPage) {
      stackRef.current = [fullPath];
      indexRef.current = 0;
      poppingRef.current = false;
      setTick((t) => t + 1);
      return;
    }

    if (poppingRef.current) {
      poppingRef.current = false;
      const found = stack.lastIndexOf(fullPath);
      if (found >= 0) indexRef.current = found;
      setTick((t) => t + 1);
      return;
    }

    // Same entry (e.g. remount) — ignore
    if (idx >= 0 && stack[idx] === fullPath) {
      setTick((t) => t + 1);
      return;
    }

    // Same pathname, only query changed (replace-style) — update top entry
    if (idx >= 0) {
      const currentPathname = stack[idx].split("?")[0];
      if (currentPathname === location.pathname) {
        stack[idx] = fullPath;
        setTick((t) => t + 1);
        return;
      }
    }

    // Browser back detected: landed on previous stack entry
    if (idx > 0 && stack[idx - 1] === fullPath) {
      indexRef.current = idx - 1;
      setTick((t) => t + 1);
      return;
    }

    // Forward navigation into a subpage — keep prior sidebar page as root
    const next = stack.slice(0, idx + 1);
    if (next.length === 0 || next[next.length - 1] !== fullPath) {
      next.push(fullPath);
      while (next.length > MAX_STACK) next.shift();
    }
    stackRef.current = next;
    indexRef.current = next.length - 1;
    setTick((t) => t + 1);
  }, [fullPath, location.pathname, onSidebarPage]);

  // Only show Back on subpages — never on sidebar-direct pages
  const showBack = shouldShowPageBack(location.pathname);

  const goBack = useCallback(() => {
    if (!shouldShowPageBack(location.pathname)) return;

    const stack = stackRef.current;
    const idx = indexRef.current;

    if (idx > 0) {
      poppingRef.current = true;
      indexRef.current = idx - 1;
      navigate(stack[indexRef.current]);
      setTick((t) => t + 1);
      return;
    }

    navigate(getBackFallbackPath(location.pathname));
  }, [navigate, location.pathname]);

  return { showBack, goBack, canGoBack: showBack && indexRef.current > 0 };
}
