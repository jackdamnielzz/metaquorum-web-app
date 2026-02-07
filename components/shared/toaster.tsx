"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { useToastStore, type ToastItem } from "@/lib/toast-store";
import { Button } from "@/components/ui/button";

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[90] flex w-[min(92vw,360px)] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className={`pointer-events-auto rounded-lg border bg-card p-3 shadow-lg ${toastClass(toast)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  {toast.variant === "success" ? <CheckCircle2 className="h-4 w-4" /> : null}
                  {toast.variant === "error" ? <CircleAlert className="h-4 w-4" /> : null}
                  {toast.title}
                </p>
                {toast.description ? (
                  <p className="mt-1 text-xs text-muted-foreground">{toast.description}</p>
                ) : null}
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss toast"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function toastClass(toast: ToastItem): string {
  if (toast.variant === "success") {
    return "border-emerald-200";
  }
  if (toast.variant === "error") {
    return "border-red-200";
  }
  return "border-border";
}
