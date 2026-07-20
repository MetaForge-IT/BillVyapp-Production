import { useCallback, useEffect, useRef, useState } from "react";

export type HeaderPanel = "notifications" | "profile" | null;

export function useHeaderPanels() {
  const [activePanel, setActivePanel] = useState<HeaderPanel>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const closePanel = useCallback(() => setActivePanel(null), []);

  const togglePanel = useCallback((panel: Exclude<HeaderPanel, null>) => {
    setActivePanel((current) => (current === panel ? null : panel));
  }, []);

  const openPanel = useCallback((panel: Exclude<HeaderPanel, null>) => {
    setActivePanel(panel);
  }, []);

  useEffect(() => {
    if (!activePanel) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activePanel, closePanel]);

  useEffect(() => {
    if (!activePanel) return;

    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current?.contains(event.target as Node)) return;
      closePanel();
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [activePanel, closePanel]);

  return {
    activePanel,
    containerRef,
    closePanel,
    togglePanel,
    openPanel,
    isNotificationsOpen: activePanel === "notifications",
    isProfileOpen: activePanel === "profile",
  };
}

export function useMenuKeyboardNav(
  isOpen: boolean,
  itemCount: number,
  onClose: () => void,
  onSelect?: (index: number) => void,
) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFocusedIndex(0);
    const frame = requestAnimationFrame(() => {
      const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
      first?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!itemCount) return;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setFocusedIndex((i) => (i + 1) % itemCount);
        break;
      case "ArrowUp":
        event.preventDefault();
        setFocusedIndex((i) => (i - 1 + itemCount) % itemCount);
        break;
      case "Home":
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case "End":
        event.preventDefault();
        setFocusedIndex(itemCount - 1);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        onSelect?.(focusedIndex);
        break;
      case "Escape":
        event.preventDefault();
        onClose();
        break;
      case "Tab":
        onClose();
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    items?.[focusedIndex]?.focus();
  }, [focusedIndex, isOpen]);

  return { menuRef, onKeyDown, focusedIndex, setFocusedIndex };
}
