"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/helpers";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "destructive" | "warning";
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Ya, Konfirmasi",
  cancelLabel = "Batal",
  variant = "primary"
}: ConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px] clay-card border-0 p-0 overflow-hidden">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl font-bold text-foreground text-left">
              {title}
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground mt-2 mb-6">
            {description}
          </p>

          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted cursor-pointer clay-transition"
            >
              {cancelLabel}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={cn(
                "px-4 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer clay-transition shadow-sm",
                variant === "primary" && "bg-primary hover:bg-primary/90",
                variant === "destructive" && "bg-destructive hover:bg-destructive/90",
                variant === "warning" && "bg-warning hover:bg-warning/90"
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
