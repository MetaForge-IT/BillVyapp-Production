import { useEffect, useState } from "react";

/** True when viewport width is at least `minWidthPx`. */
export function useMinWidth(minWidthPx: number) {
  const query = `(min-width: ${minWidthPx}px)`;
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);

  return matches;
}
