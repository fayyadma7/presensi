"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useNavigationTransition } from "@/contexts/NavigationContext";

export default function DashboardNavigationLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const router = useRouter();
  const { beginNavigation } = useNavigationTransition();

  return (
    <Link
      href={href}
      className={className}
      onPointerDown={() => router.prefetch(href)}
      onMouseEnter={() => router.prefetch(href)}
      onClick={(event) => {
        event.preventDefault();
        router.push(href);
        beginNavigation(href);
      }}
    >
      {children}
    </Link>
  );
}
