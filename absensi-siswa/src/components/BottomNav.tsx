"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Home, ClipboardCheck, User, LogOut, Users, Settings, GraduationCap } from "lucide-react";
import { cn } from "@/lib/helpers";

interface BottomNavProps {
  onLogout: () => void;
}

type BottomNavItemLink = {
  type: "link";
  href: string;
  label: string;
  icon: any;
  roles: string[];
  waliOnly: boolean;
};

type BottomNavItemPopup = {
  type: "popup";
  label: string;
  icon: any;
  roles: string[];
  waliOnly: boolean;
  items: { href: string; label: string; icon: any }[];
};

type BottomNavItem = BottomNavItemLink | BottomNavItemPopup;

const bottomNavItems: BottomNavItem[] = [
  { type: "link", href: "/dashboard", label: "Beranda", icon: Home, roles: ["admin", "guru"], waliOnly: false },
  { type: "popup", label: "Data", icon: Users, roles: ["admin"], waliOnly: false, items: [
    { href: "/admin/students", label: "Siswa", icon: Users },
    { href: "/admin/teachers", label: "Guru", icon: GraduationCap },
  ]},
  { type: "link", href: "/guru/presensi?tab=harian", label: "Presensi", icon: ClipboardCheck, roles: ["guru"], waliOnly: false },
  { type: "link", href: "/siswa/presensi", label: "Presensi", icon: ClipboardCheck, roles: ["siswa"], waliOnly: false },
  { type: "link", href: "/admin/settings", label: "Pengaturan", icon: Settings, roles: ["admin"], waliOnly: false },
  { type: "link", href: "/guru/profil", label: "Profil", icon: User, roles: ["guru"], waliOnly: false },
  { type: "link", href: "/tenaga-kependidikan/presensi", label: "Presensi", icon: ClipboardCheck, roles: ["tenaga_kependidikan"], waliOnly: false },
  { type: "link", href: "/tenaga-kependidikan/profil", label: "Profil", icon: User, roles: ["tenaga_kependidikan"], waliOnly: false },
  { type: "link", href: "/siswa/profil", label: "Profil", icon: User, roles: ["siswa"], waliOnly: false },
];

export default function BottomNav({ onLogout, userRole, isWaliKelas }: BottomNavProps & { userRole: string; isWaliKelas: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [activePopup, setActivePopup] = useState<string | null>(null);

  const filtered = bottomNavItems.filter((item) => {
    if (!item.roles) return true;
    if (!item.roles.includes(userRole)) return false;
    if (item.waliOnly && userRole === "guru" && !isWaliKelas) return false;
    return true;
  });

  function isActive(href: string) {
    const base = href.split("?")[0];
    return pathname === base || (base !== "/dashboard" && pathname.startsWith(base));
  }

  function isPopupActive(items: { href: string }[]) {
    return items.some((item) => isActive(item.href));
  }

  function navigateTo(href: string) {
    setActivePopup(null);
    router.push(href);
  }

  return (
    <>
      {/* Popup Overlay */}
      {activePopup && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setActivePopup(null)}
        />
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bottom-nav px-2 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around py-2 relative">
          {filtered.map((item) => {
            if (item.type === "link") {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2 rounded-2xl min-w-[64px] clay-transition",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "p-2 rounded-xl clay-transition",
                      active
                        ? "bg-primary text-white shadow-[0_4px_12px_rgba(79,70,229,0.3)]"
                        : "bg-muted"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-bold">{item.label}</span>
                </Link>
              );
            }

            if (item.type === "popup") {
              const Icon = item.icon;
              const isOpen = activePopup === item.label;
              const active = isPopupActive(item.items);
              return (
                <div key={item.label} className="relative flex flex-col items-center">
                  <button
                    onClick={() => setActivePopup(isOpen ? null : item.label)}
                    className={cn(
                      "flex flex-col items-center gap-1 px-3 py-2 rounded-2xl min-w-[64px] clay-transition",
                      active || isOpen
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div
                      className={cn(
                        "p-2 rounded-xl clay-transition",
                        active || isOpen
                          ? "bg-primary text-white shadow-[0_4px_12px_rgba(79,70,229,0.3)]"
                          : "bg-muted"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold">{item.label}</span>
                  </button>

                  {/* Popup */}
                  {isOpen && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 clay-card rounded-2xl p-2 shadow-xl z-50 min-w-[160px] animate-in fade-in zoom-in-95">
                      {item.items.map((sub) => {
                        const SubIcon = sub.icon;
                        const subActive = isActive(sub.href);
                        return (
                          <button
                            key={sub.href}
                            onClick={() => navigateTo(sub.href)}
                            className={cn(
                              "w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium clay-transition",
                              subActive
                                ? "bg-primary/10 text-primary"
                                : "text-foreground hover:bg-muted"
                            )}
                          >
                            <SubIcon className="h-4 w-4" />
                            {sub.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })}
          <button
            onClick={onLogout}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl min-w-[64px] text-muted-foreground hover:text-destructive clay-transition"
          >
            <div className="p-2 rounded-xl bg-muted hover:bg-destructive/10 clay-transition">
              <LogOut className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold">Keluar</span>
          </button>
        </div>
      </nav>
    </>
  );
}
