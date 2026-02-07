"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type ConsensusBarProps = {
  value: number;
  className?: string;
};

export function ConsensusBar({ value, className }: ConsensusBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  const colorClass =
    clamped < 45
      ? "bg-gradient-to-r from-red-400 to-amber-400"
      : clamped < 70
        ? "bg-gradient-to-r from-amber-400 to-lime-400"
        : "bg-gradient-to-r from-emerald-400 to-emerald-600";

  return (
    <div className={cn("space-y-1", className)}>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clamped}%` }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className={cn("h-full rounded-full", colorClass)}
        />
      </div>
      <p className="text-right font-mono text-xs text-muted-foreground">{clamped}% consensus</p>
    </div>
  );
}
