"use client";

import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  userId: string;
  userRole: string;
  userName: string;
  isWaliKelas: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  userId: "",
  userRole: "",
  userName: "",
  isWaliKelas: false,
  loading: true,
});

export function AuthProvider({
  children,
  serverUser,
  serverUserRole,
  serverUserName,
  serverIsWaliKelas,
}: {
  children: ReactNode;
  serverUser: User | null;
  serverUserRole: string;
  serverUserName: string;
  serverIsWaliKelas: boolean;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(serverUser);
  const [userRole, setUserRole] = useState<string>(serverUserRole);
  const [userName, setUserName] = useState<string>(serverUserName);
  const [isWaliKelas, setIsWaliKelas] = useState<boolean>(serverIsWaliKelas);
  const [loading, setLoading] = useState(!serverUser);

  useEffect(() => {
    if (serverUser) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate auth state from server session
      setUser(serverUser);
      setUserRole(serverUserRole);
      setUserName(serverUserName);
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
        router.replace("/login");
        return;
      }

      setUser(authUser);

      const { data: userData } = await supabase
        .from("users")
        .select("role, name")
        .eq("id", authUser.id)
        .maybeSingle();

      setUserRole(userData?.role || "");
      setUserName(userData?.name || "");
      setLoading(false);
    }

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string) => {
        if (event === "SIGNED_OUT") {
          setUser(null);
          setUserRole("");
          setUserName("");
          router.replace("/login");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase, router, serverUser, serverUserRole, serverUserName, serverIsWaliKelas]);

  const value = useMemo(
    () => ({
      user,
      userId: user?.id || "",
      userRole,
      userName,
      isWaliKelas,
      loading,
    }),
    [user, userRole, userName, isWaliKelas, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
