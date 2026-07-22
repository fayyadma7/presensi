"use client";

import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  userId: string;
  userRole: string;
  isWaliKelas: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  userId: "",
  userRole: "",
  isWaliKelas: false,
  loading: true,
});

export function AuthProvider({
  children,
  serverUser,
  serverUserRole,
  serverIsWaliKelas,
}: {
  children: ReactNode;
  serverUser: User | null;
  serverUserRole: string;
  serverIsWaliKelas: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(serverUser);
  const [userRole, setUserRole] = useState<string>(serverUserRole);
  const [isWaliKelas, setIsWaliKelas] = useState<boolean>(serverIsWaliKelas);
  const [loading, setLoading] = useState(!serverUser);

  useEffect(() => {
    if (serverUser) {
      setUser(serverUser);
      setUserRole(serverUserRole);
      setIsWaliKelas(serverIsWaliKelas);
      setLoading(false);
      return;
    }

    async function fetchUser() {
      const {
        data: { user: authUser },
        error,
      } = await supabase.auth.getUser();

      if (error || !authUser) {
        router.push("/login");
        return;
      }

      setUser(authUser);

      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", authUser.id)
        .maybeSingle();

      setUserRole(userData?.role || "");
      setLoading(false);
    }

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string) => {
        if (event === "SIGNED_OUT") {
          setUser(null);
          setUserRole("");
          router.push("/login");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase, router, serverUser, serverUserRole, serverIsWaliKelas]);

  const value = useMemo(
    () => ({
      user,
      userId: user?.id || "",
      userRole,
      isWaliKelas,
      loading,
    }),
    [user, userRole, isWaliKelas, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
