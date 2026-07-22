"use client";

import { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/helpers";
import { useState, useRef, useEffect } from "react";

interface TabItem {
  key: string;
  label: string;
  icon: LucideIcon;
  shortLabel?: string;
}

interface TabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (key: string) => void;
  className?: string;
}

export function TabBar({ tabs, activeTab, onChange, className }: TabBarProps) {
  const pathname = usePathname(); // Needed for isActive logic if keys are paths

  return (
    <div className={`clay-card p-1.5 flex gap-1 ${className || ""}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm flex-1 justify-center clay-transition cursor-pointer",
              isActive
                ? "bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(79,70,229,0.3)]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.shortLabel || tab.key}</span>
          </button>
        );
      })}
    </div>
  );
}
