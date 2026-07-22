"use client";

import { memo } from "react";
import { CheckCircle, Clock, Calendar, XCircle, AlertTriangle, MapPin, User, LogIn, HeartPulse, FileText } from "lucide-react";
import { cn } from "@/lib/helpers";

interface StatusBadgeProps {
  status: string;
  className?: string;
  showIcon?: boolean;
}

export const StatusBadge = memo(function StatusBadge({
  status,
  className,
  showIcon = true
}: StatusBadgeProps) {
  const config: Record<string, { bg: string; text: string; label: string; icon: any }> = {
    hadir: {
      bg: "bg-success/10 border-success/20",
      text: "text-success",
      label: "Hadir",
      icon: CheckCircle
    },
    terlambat: {
      bg: "bg-warning/10 border-warning/20",
      text: "text-warning",
      label: "Terlambat",
      icon: Clock
    },
    sakit: {
      bg: "bg-blue-100 border-blue-200",
      text: "text-blue-600",
      label: "Sakit",
      icon: HeartPulse
    },
    izin: {
      bg: "bg-secondary/10 border-secondary/20",
      text: "text-secondary-foreground",
      label: "Izin",
      icon: FileText
    },
    alpa: {
      bg: "bg-destructive/10 border-destructive/20",
      text: "text-destructive",
      label: "Alpa",
      icon: XCircle
    },
    pulang: {
      bg: "bg-success/10 border-success/20",
      text: "text-success",
      label: "Pulang",
      icon: MapPin
    },
    hadir_di_kelas: {
      bg: "bg-success/10 border-success/20",
      text: "text-success",
      label: "Hadir di Kelas",
      icon: CheckCircle
    },
    penugasan: {
      bg: "bg-warning/10 border-warning/20",
      text: "text-warning",
      label: "Penugasan",
      icon: AlertTriangle
    }
  };

  const c = config[status] || {
    bg: "bg-muted border-border",
    text: "text-muted-foreground",
    label: status || "Belum Presensi",
    icon: Clock
  };

  const Icon = c.icon;

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold border-2 rounded-xl whitespace-nowrap clay-transition",
      c.bg,
      c.text,
      className
    )}>
      {showIcon && <Icon className="h-3.5 w-3.5" />}
      {c.label}
    </span>
  );
});
