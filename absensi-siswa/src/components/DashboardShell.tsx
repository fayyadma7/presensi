"use client";

import type { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import BottomNavWrapper from "@/components/BottomNavWrapper";
import Footer from "@/components/Footer";
import { useNavigationTransition } from "@/contexts/NavigationContext";
import DashboardContentSkeleton from "@/components/DashboardContentSkeleton";

export default function DashboardShell({ children, userRole, isWaliKelas }: { children: ReactNode; userRole: string; isWaliKelas: boolean }) {
  const { pendingHref, isLoggingOut } = useNavigationTransition();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-6 flex-1 w-full">
        {pendingHref || isLoggingOut ? <DashboardContentSkeleton /> : children}
      </main>
      <Footer />
      <BottomNavWrapper userRole={userRole} isWaliKelas={isWaliKelas} />
    </div>
  );
}
