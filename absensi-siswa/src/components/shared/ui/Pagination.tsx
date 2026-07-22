"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  label?: string;
}

export default function Pagination({ currentPage, totalPages, onPageChange, totalItems, label }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col items-center gap-2 mt-4">
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed clay-transition cursor-pointer"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded-lg clay-transition cursor-pointer ${
              p === currentPage ? "bg-primary text-white" : "hover:bg-muted/50 text-muted-foreground"
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg hover:bg-muted/50 disabled:opacity-30 disabled:cursor-not-allowed clay-transition cursor-pointer"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Menampilkan {(currentPage - 1) * 10 + 1}–{Math.min(currentPage * 10, totalItems)} dari {totalItems} {label || "data"}
      </p>
    </div>
  );
}
