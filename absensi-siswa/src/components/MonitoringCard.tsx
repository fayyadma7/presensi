"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Loader2, UserRound, LogIn, LogOut } from "lucide-react";
import { formatDateLocal, formatTime } from "@/lib/helpers";
import { resolveMasukStatus, statusBadgeClass, statusLabel } from "@/lib/attendance-status";

type MonitoringResult = {
  nis: string;
  name: string;
  class_name: string | null;
  masuk_status: string | null;
  late_status: string | null;
  masuk_time: string | null;
  pulang_status: string | null;
  pulang_time: string | null;
};

export default function MonitoringCard() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MonitoringResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const today = formatDateLocal();

  const fetchResults = useCallback(
    async (q: string) => {
      const term = q.trim();
      if (!term) {
        abortRef.current?.abort();
        setResults([]);
        setLoading(false);
        setError("");
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({ q: term, date: today });
        const res = await fetch(`/api/public/monitoring?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || "Terjadi kesalahan saat memuat data");
          setResults([]);
        } else {
          setResults(json.data || []);
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError("Gagal terhubung ke server");
        }
      } finally {
        setLoading(false);
      }
    },
    [today]
  );

  // Debounce pencarian 350ms
  useEffect(() => {
    const t = setTimeout(() => {
      fetchResults(query);
    }, 350);
    return () => {
      clearTimeout(t);
      abortRef.current?.abort();
    };
  }, [query, fetchResults]);

  return (
    <div className="relative overflow-hidden rounded-[20px] border-2 border-primary/15 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/80 shadow-[0_2px_8px_rgba(0,0,0,0.08),0_8px_24px_rgba(79,70,229,0.10)]">
      {/* Accent strip atas */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-secondary to-accent" />
      <div className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(79,70,229,0.3)] shrink-0">
          <UserRound className="h-4.5 w-4.5 text-white" />
        </div>
        <div>
          <h2 className="font-heading font-bold text-foreground leading-tight">
            Pantau Kehadiran Anak
          </h2>
          <p className="text-xs text-muted-foreground">
            Cek status presensi masuk & pulang hari ini
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari nama atau NIS siswa..."
          className="clay-input w-full pl-10 pr-4 py-2.5 text-sm outline-none"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 mt-4 py-4 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Memuat data...
        </div>
      )}

      {!loading && error && (
        <p className="mt-4 py-3 px-4 text-sm text-center font-medium bg-destructive/10 text-destructive rounded-xl">
          {error}
        </p>
      )}

      {!loading && !error && query.trim() && results.length === 0 && (
        <div className="mt-4 py-4 px-4 text-sm text-center bg-muted/40 text-muted-foreground rounded-xl">
          Siswa dengan nama <span className="font-bold text-foreground">&ldquo;{query.trim()}&rdquo;</span> tidak
          ditemukan
        </div>
      )}

      {!loading && !error && results.length > 0 && (
        <>
          <div className="mt-4 space-y-2 max-h-72 overflow-y-auto pr-1">
            {results.map((r) => {
              const masuk = resolveMasukStatus(r);
              const pulang = r.pulang_status;
              const isAbsent =
                masuk === "sakit" ||
                masuk === "izin" ||
                masuk === "alpa" ||
                masuk === "dispen";
              return (
                <div
                  key={r.nis}
                  className="p-3 rounded-2xl bg-muted/40 border border-border/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-foreground line-clamp-2">{r.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.nis} {r.class_name ? `· ${r.class_name}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0 items-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusBadgeClass(masuk)}`}>
                        <LogIn className="h-3 w-3" />
                        {masuk ? statusLabel(masuk) : "Belum Masuk"}
                      </span>
                      {!isAbsent && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusBadgeClass(pulang)}`}>
                          <LogOut className="h-3 w-3" />
                          {pulang ? statusLabel(pulang) : "Belum Pulang"}
                        </span>
                      )}
                    </div>
                  </div>
                  {(r.masuk_time || r.pulang_time) && (
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      {r.masuk_time && (
                        <span>
                          {isAbsent ? "Waktu presensi: " : "Masuk "}
                          {formatTime(r.masuk_time)}
                        </span>
                      )}
                      {r.masuk_time && r.pulang_time && <span> · </span>}
                      {r.pulang_time && (
                        <span>
                          Pulang {formatTime(r.pulang_time)}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {!loading && !error && !query.trim() && (
        <p className="mt-3 text-[11px] text-center text-muted-foreground">
          Fitur untuk orang tua memantau kehadiran anak tanpa login
        </p>
      )}
      </div>
    </div>
  );
}
