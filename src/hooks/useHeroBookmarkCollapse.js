import { useCallback, useState } from "react";

export function useHeroBookmarkCollapse(storageKey, defaultCollapsed = false) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return defaultCollapsed;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === "true") return true;
      if (stored === "false") return false;
    } catch {
      // ignore storage errors
    }
    return defaultCollapsed;
  });

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(storageKey, String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, [storageKey]);

  return { collapsed, toggle, expanded: !collapsed };
}
