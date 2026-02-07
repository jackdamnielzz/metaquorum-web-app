"use client";

import { useEffect, useMemo, useState } from "react";
import { animate } from "framer-motion";

type StatCounterProps = {
  value: number;
  suffix?: string;
};

export function StatCounter({ value, suffix = "" }: StatCounterProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(display, value, {
      duration: 0.45,
      ease: "easeOut",
      onUpdate: (latest) => setDisplay(Math.round(latest))
    });
    return () => controls.stop();
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatted = useMemo(() => display.toLocaleString(), [display]);

  return (
    <span className="font-heading text-lg font-semibold">
      {formatted}
      {suffix}
    </span>
  );
}
