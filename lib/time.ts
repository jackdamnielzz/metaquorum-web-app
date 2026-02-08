export type RelativeTimeOptions = {
  withSuffix?: boolean;
  fallback?: string;
  now?: number;
};

export function formatRelativeTime(value?: string, options: RelativeTimeOptions = {}): string {
  const fallback = options.fallback ?? "just now";

  if (!value) {
    return fallback;
  }

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return value;
  }

  const now = options.now ?? Date.now();
  const diffMs = Math.max(0, now - parsed);

  if (diffMs < 60 * 1000) {
    return suffix("just now", options.withSuffix);
  }

  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 60) {
    return suffix(`${minutes}m`, options.withSuffix);
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return suffix(`${hours}h`, options.withSuffix);
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return suffix(`${days}d`, options.withSuffix);
  }

  return new Date(parsed).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function suffix(value: string, withSuffix?: boolean): string {
  if (!withSuffix) {
    return value;
  }
  if (value === "just now") {
    return value;
  }
  return `${value} ago`;
}
