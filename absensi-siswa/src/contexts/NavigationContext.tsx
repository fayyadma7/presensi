"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { flushSync } from "react-dom";

type NavigationContextValue = {
  pendingHref: string | null;
  isLoggingOut: boolean;
  beginNavigation: (href: string) => void;
  beginLogout: () => void;
};

const NavigationContext = createContext<NavigationContextValue>({
  pendingHref: null,
  isLoggingOut: false,
  beginNavigation: () => {},
  beginLogout: () => {},
});

function getRouteKey(href: string) {
  const url = new URL(href, "http://localhost");
  return `${url.pathname}${url.search}`;
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentRouteKey = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`;

  // Clear pendingHref whenever the URL actually changes (any pathname change = navigation complete)
  useEffect(() => {
    if (pendingHref !== null) {
      setPendingHref(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams.toString()]);

  // Safety timeout: auto-clear pendingHref after 5s to prevent infinite skeleton
  useEffect(() => {
    if (pendingHref !== null) {
      timeoutRef.current = setTimeout(() => {
        setPendingHref(null);
      }, 5000);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [pendingHref]);

  // effectivePendingHref is null if we're already at the target
  const effectivePendingHref =
    pendingHref && getRouteKey(pendingHref) === currentRouteKey ? null : pendingHref;

  const value = useMemo(() => ({
    pendingHref: effectivePendingHref,
    isLoggingOut,
    beginNavigation: (href: string) => {
      flushSync(() => setPendingHref(href));
    },
    beginLogout: () => {
      flushSync(() => setIsLoggingOut(true));
    },
  }), [effectivePendingHref, isLoggingOut]);

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigationTransition() {
  return useContext(NavigationContext);
}
