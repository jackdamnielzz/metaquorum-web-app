"use client";

import { useEffect, useMemo, useState } from "react";
import { formatRelativeTime } from "@/lib/time";

const RELATIVE_TIME_REFRESH_MS = 60 * 1000;

export function useRelativeTime(value?: string, withSuffix = false): string {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, RELATIVE_TIME_REFRESH_MS);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return useMemo(
    () => formatRelativeTime(value, { withSuffix, now }),
    [value, withSuffix, now]
  );
}
