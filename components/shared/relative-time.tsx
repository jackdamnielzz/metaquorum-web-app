"use client";

import { useRelativeTime } from "@/lib/use-relative-time";

type RelativeTimeProps = {
  value?: string;
  withSuffix?: boolean;
  className?: string;
};

export function RelativeTime({ value, withSuffix = false, className }: RelativeTimeProps) {
  const label = useRelativeTime(value, withSuffix);
  return <span className={className}>{label}</span>;
}
