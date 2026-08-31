import { useEffect, useRef, useState, type ReactElement } from "react";
import { ResponsiveContainer } from "recharts";
import { cn } from "../ui/utils";

type SafeChartContainerProps = {
  children: ReactElement;
  className?: string;
  /** Fixed height in px, or CSS height string. */
  height?: number | string;
  minHeight?: number;
  debounce?: number;
};

/**
 * Wraps Recharts ResponsiveContainer and only mounts the chart once the
 * container has non-zero width and height (avoids width(0)/height(0) warnings
 * when parents are display:none, flex-collapsed, or not yet laid out).
 */
export function SafeChartContainer({
  children,
  className,
  height,
  minHeight = 32,
  debounce = 50,
}: SafeChartContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const { width, height: h } = el.getBoundingClientRect();
      setReady(width > 0 && h > 0);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("w-full min-w-0 max-w-full", className)}
      style={{
        height: height ?? "100%",
        minHeight,
      }}
    >
      {ready ? (
        <ResponsiveContainer width="100%" height="100%" debounce={debounce}>
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
