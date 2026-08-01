"use client";

import type { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import BottomNavWrapper from "@/components/BottomNavWrapper";
import Footer from "@/components/Footer";
import { useNavigationTransition } from "@/contexts/NavigationContext";

export function ContentSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label="Memuat halaman">
      <div className="clay-card h-32 p-6"><div className="h-5 w-36 rounded-full bg-slate-100" /><div className="mt-6 h-9 w-24 rounded-full bg-slate-100" /></div>
      <div className="clay-card h-32 p-6"><div className="h-5 w-28 rounded-full bg-slate-100" /><div className="mt-6 h-9 w-20 rounded-full bg-slate-100" /></div>
      <div className="clay-card h-96 p-6"><div className="h-5 w-56 rounded-full bg-slate-100" /><div className="mt-7 h-64 rounded-2xl bg-slate-100" /></div>
      <div className="clay-card h-32 p-6"><div className="h-5 w-28 rounded-full bg-slate-100" /><div className="mt-6 h-9 w-20 rounded-full bg-slate-100" /></div>
    </div>
  );
}

export default function DashboardShell({ children, userRole, isWaliKelas }: { children: ReactNode; userRole: string; isWaliKelas: boolean }) {
  const { pendingHref } = useNavigationTransition();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-6 flex-1 w-full">
        {pendingHref ? <ContentSkeleton /> : children}
      </main>
      <Footer />
      <BottomNavWrapper userRole={userRole} isWaliKelas={isWaliKelas} />
    </div>
  );
}
