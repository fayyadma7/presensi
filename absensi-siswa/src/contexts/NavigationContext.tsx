"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { flushSync } from "react-dom";

type NavigationContextValue = {
  pendingHref: string | null;
  beginNavigation: (href: string) => void;
};

const NavigationContext = createContext<NavigationContextValue>({
  pendingHref: null,
  beginNavigation: () => {},
});

function getRouteKey(href: string) {
  const url = new URL(href, "http://localhost");
  return `${url.pathname}${url.search}`;
}

export function NavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const currentRouteKey = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`;

  useEffect(() => {
    if (pendingHref && getRouteKey(pendingHref) === currentRouteKey) {
      setPendingHref(null);
    }
  }, [currentRouteKey, pendingHref]);

  const value = useMemo(() => ({
    pendingHref,
    beginNavigation: (href: string) => {
      flushSync(() => setPendingHref(href));
    },
  }), [pendingHref]);

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigationTransition() {
  return useContext(NavigationContext);
}
