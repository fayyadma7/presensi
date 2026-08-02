"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
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
  const currentRouteKey = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`;
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
