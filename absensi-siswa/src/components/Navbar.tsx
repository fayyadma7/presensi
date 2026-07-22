"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useRef } from "react";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  ClipboardCheck,
  LogOut,
  School,
  Settings,
  QrCode,
  User,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/helpers";

type NavItemLink = {
  type: "link";
  href: string;
  label: string;
  icon: any;
  roles: string[];
  waliOnly: boolean;
};

type NavItemDropdown = {
  type: "dropdown";
  label: string;
  icon: any;
  roles: string[];
  waliOnly: boolean;
  items: { href: string; label: string; icon: any }[];
};

type NavItem = NavItemLink | NavItemDropdown;

const navItems: NavItem[] = [
  { type: "link", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "guru"], waliOnly: false },
  { type: "dropdown", label: "Data", icon: Users, roles: ["admin"], waliOnly: false, items: [
    { href: "/admin/students", label: "Data Siswa", icon: Users },
    { href: "/admin/teachers", label: "Data Guru", icon: GraduationCap },
  ]},
  { type: "link", href: "/guru/presensi?tab=harian", label: "Presensi", icon: ClipboardCheck, roles: ["guru"], waliOnly: false },
  { type: "link", href: "/guru/profil", label: "Profil", icon: User, roles: ["guru"], waliOnly: false },
  { type: "link", href: "/tenaga-kependidikan/presensi", label: "Presensi", icon: ClipboardCheck, roles: ["tenaga_kependidikan"], waliOnly: false },
  { type: "link", href: "/tenaga-kependidikan/profil", label: "Profil", icon: User, roles: ["tenaga_kependidikan"], waliOnly: false },
  { type: "link", href: "/admin/settings", label: "Pengaturan", icon: Settings, roles: ["admin"], waliOnly: false },
  { type: "link", href: "/siswa/presensi", label: "Presensi", icon: QrCode, roles: ["siswa"], waliOnly: false },
  { type: "link", href: "/siswa/profil", label: "Profil", icon: User, roles: ["siswa"], waliOnly: false },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [isWaliKelas, setIsWaliKelas] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data } = await supabase
        .from("users")
        .select("name, role")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        setUserName(data.name);
        setUserRole(data.role);
        if (data.role === "guru") {
          const { data: kelasData } = await supabase
            .from("classes")
            .select("id")
            .eq("wali_kelas_id", user.id)
            .maybeSingle();
          setIsWaliKelas(!!kelasData);
        }
      }
    }
    getUser();
  }, [supabase, router]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const filteredNav = navItems.filter((item) => {
    if (!userRole) return false;
    if (!item.roles.includes(userRole)) return false;
    if (item.waliOnly && userRole === "guru" && !isWaliKelas) return false;
    return true;
  });

  function isActive(href: string) {
    const base = href.split("?")[0];
    return pathname === base || pathname.startsWith(base + "/");
  }

  function isDropdownActive(items: { href: string }[]) {
    return items.some((item) => isActive(item.href));
  }

  return (
    <>
      {/* Desktop Navbar - Claymorphism Style */}
      <nav className="hidden md:block sticky top-0 z-50 mx-4 mt-4">
        <div className="max-w-7xl mx-auto">
          <div className="clay-card flex items-center justify-between px-6 py-3">
            {/* Logo */}
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-heading font-bold text-lg cursor-pointer clay-transition hover:opacity-80"
            >
              <div className="p-2 bg-primary rounded-xl shadow-[0_4px_12px_rgba(79,70,229,0.3)]">
                <School className="h-5 w-5 text-white" />
              </div>
              <span className="text-foreground">Presensi SMK Muhammadiyah 3</span>
            </Link>

            {/* Nav Links */}
            <div className="flex items-center gap-1" ref={dropdownRef}>
              {filteredNav.map((item) => {
                if (item.type === "link") {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer clay-transition",
                        active
                          ? "bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(79,70,229,0.3)]"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                }

                if (item.type === "dropdown") {
                  const Icon = item.icon;
                  const isOpen = openDropdown === item.label;
                  const active = isDropdownActive(item.items);
                  return (
                    <div key={item.label} className="relative">
                      <button
                        onClick={() => setOpenDropdown(isOpen ? null : item.label)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer clay-transition",
                          active || isOpen
                            ? "bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(79,70,229,0.3)]"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                        <ChevronDown className={cn("h-3.5 w-3.5 clay-transition", isOpen && "rotate-180")} />
                      </button>
                      {isOpen && (
                        <div className="absolute top-full left-0 mt-1 w-48 clay-card p-1.5 rounded-xl shadow-clay-xl z-50 animate-in fade-in zoom-in-95">
                          {item.items.map((sub) => {
                            const SubIcon = sub.icon;
                            const subActive = isActive(sub.href);
                            return (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                onClick={() => setOpenDropdown(null)}
                                className={cn(
                                  "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium clay-transition",
                                  subActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-foreground hover:bg-muted"
                                )}
                              >
                                <SubIcon className="h-4 w-4" />
                                {sub.label}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })}
            </div>

            {/* User Info & Logout */}
            <div className="flex items-center gap-3">
              <div className="clay-badge px-3 py-1.5 bg-primary/10 text-primary">
                <span className="text-sm font-medium select-none">
                  {userName}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer clay-transition focus:outline-none focus:ring-2 focus:ring-destructive/20"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Spacer for content below navbar on desktop */}
      <div className="hidden md:block h-4" />
    </>
  );
}
