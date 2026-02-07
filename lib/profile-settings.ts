export const PROFILE_SETTINGS_EVENT = "mq-profile-updated";

export type ExpertiseLevel = "builder" | "researcher" | "clinician" | "student";
export type ProfileVisibility = "public" | "quorum_only" | "private";
export type AccentColor = "teal" | "indigo" | "emerald" | "amber";
export type DefaultSort = "hot" | "new" | "consensus";

export type ProfileSettings = {
  username: string;
  displayName: string;
  avatarDataUrl: string;
  headline: string;
  bio: string;
  focusTags: string[];
  expertiseLevel: ExpertiseLevel;
  defaultQuorum: string;
  defaultSort: DefaultSort;
  autoAnalyze: boolean;
  liveUpdates: boolean;
  notifyMentions: boolean;
  notifyReplies: boolean;
  weeklyDigest: boolean;
  profileVisibility: ProfileVisibility;
  showOnlineStatus: boolean;
  showContributionStats: boolean;
  shareActivityFeed: boolean;
  accent: AccentColor;
};

export const PROFILE_SETTINGS_KEYS = {
  username: "mq.settings.username",
  displayName: "mq.settings.displayName",
  avatarDataUrl: "mq.settings.avatarDataUrl",
  headline: "mq.settings.headline",
  bio: "mq.settings.bio",
  focusTags: "mq.settings.focusTags",
  expertiseLevel: "mq.settings.expertiseLevel",
  defaultQuorum: "mq.settings.defaultQuorum",
  defaultSort: "mq.settings.defaultSort",
  autoAnalyze: "mq.settings.autoAnalyze",
  liveUpdates: "mq.settings.liveUpdates",
  notifyMentions: "mq.settings.notifyMentions",
  notifyReplies: "mq.settings.notifyReplies",
  weeklyDigest: "mq.settings.weeklyDigest",
  profileVisibility: "mq.settings.profileVisibility",
  showOnlineStatus: "mq.settings.showOnlineStatus",
  showContributionStats: "mq.settings.showContributionStats",
  shareActivityFeed: "mq.settings.shareActivityFeed",
  accent: "mq.settings.accent"
} as const;

export const DEFAULT_PROFILE_SETTINGS: ProfileSettings = {
  username: "eduard",
  displayName: "Eduard",
  avatarDataUrl: "",
  headline: "Human researcher",
  bio: "Building evidence-backed threads for translational research.",
  focusTags: ["longevity", "trial-design"],
  expertiseLevel: "researcher",
  defaultQuorum: "longevity",
  defaultSort: "hot",
  autoAnalyze: true,
  liveUpdates: true,
  notifyMentions: true,
  notifyReplies: true,
  weeklyDigest: false,
  profileVisibility: "public",
  showOnlineStatus: true,
  showContributionStats: true,
  shareActivityFeed: true,
  accent: "teal"
};

export function loadProfileSettings(): ProfileSettings {
  if (typeof window === "undefined") {
    return DEFAULT_PROFILE_SETTINGS;
  }

  const usernameRaw = window.localStorage.getItem(PROFILE_SETTINGS_KEYS.username);
  const displayNameRaw = window.localStorage.getItem(PROFILE_SETTINGS_KEYS.displayName);
  const avatarDataUrlRaw = window.localStorage.getItem(PROFILE_SETTINGS_KEYS.avatarDataUrl);
  const headlineRaw = window.localStorage.getItem(PROFILE_SETTINGS_KEYS.headline);
  const bioRaw = window.localStorage.getItem(PROFILE_SETTINGS_KEYS.bio);
  const tagsRaw = window.localStorage.getItem(PROFILE_SETTINGS_KEYS.focusTags);
  const expertiseRaw = window.localStorage.getItem(PROFILE_SETTINGS_KEYS.expertiseLevel);
  const defaultQuorumRaw = window.localStorage.getItem(PROFILE_SETTINGS_KEYS.defaultQuorum);
  const defaultSortRaw = window.localStorage.getItem(PROFILE_SETTINGS_KEYS.defaultSort);
  const autoAnalyzeRaw = window.localStorage.getItem(PROFILE_SETTINGS_KEYS.autoAnalyze);
  const liveUpdatesRaw = window.localStorage.getItem(PROFILE_SETTINGS_KEYS.liveUpdates);
  const notifyMentionsRaw = window.localStorage.getItem(PROFILE_SETTINGS_KEYS.notifyMentions);
  const notifyRepliesRaw = window.localStorage.getItem(PROFILE_SETTINGS_KEYS.notifyReplies);
  const weeklyDigestRaw = window.localStorage.getItem(PROFILE_SETTINGS_KEYS.weeklyDigest);
  const visibilityRaw = window.localStorage.getItem(PROFILE_SETTINGS_KEYS.profileVisibility);
  const showOnlineRaw = window.localStorage.getItem(PROFILE_SETTINGS_KEYS.showOnlineStatus);
  const showStatsRaw = window.localStorage.getItem(PROFILE_SETTINGS_KEYS.showContributionStats);
  const shareActivityRaw = window.localStorage.getItem(PROFILE_SETTINGS_KEYS.shareActivityFeed);
  const accentRaw = window.localStorage.getItem(PROFILE_SETTINGS_KEYS.accent);

  const username = sanitizeUsername(usernameRaw ?? DEFAULT_PROFILE_SETTINGS.username);
  const displayName = normalizeText(displayNameRaw, DEFAULT_PROFILE_SETTINGS.displayName);
  const headline = normalizeText(headlineRaw, DEFAULT_PROFILE_SETTINGS.headline);
  const bio = normalizeText(bioRaw, DEFAULT_PROFILE_SETTINGS.bio);
  const focusTags = parseTags(tagsRaw, DEFAULT_PROFILE_SETTINGS.focusTags);
  const expertiseLevel = parseEnum<ExpertiseLevel>(expertiseRaw, [
    "builder",
    "researcher",
    "clinician",
    "student"
  ], DEFAULT_PROFILE_SETTINGS.expertiseLevel);
  const defaultSort = parseEnum<DefaultSort>(defaultSortRaw, [
    "hot",
    "new",
    "consensus"
  ], DEFAULT_PROFILE_SETTINGS.defaultSort);
  const profileVisibility = parseEnum<ProfileVisibility>(visibilityRaw, [
    "public",
    "quorum_only",
    "private"
  ], DEFAULT_PROFILE_SETTINGS.profileVisibility);
  const accent = parseEnum<AccentColor>(accentRaw, [
    "teal",
    "indigo",
    "emerald",
    "amber"
  ], DEFAULT_PROFILE_SETTINGS.accent);

  return {
    username,
    displayName,
    avatarDataUrl: avatarDataUrlRaw ?? DEFAULT_PROFILE_SETTINGS.avatarDataUrl,
    headline,
    bio,
    focusTags,
    expertiseLevel,
    defaultQuorum: normalizeText(defaultQuorumRaw, DEFAULT_PROFILE_SETTINGS.defaultQuorum),
    defaultSort,
    autoAnalyze: parseBoolean(autoAnalyzeRaw, DEFAULT_PROFILE_SETTINGS.autoAnalyze),
    liveUpdates: parseBoolean(liveUpdatesRaw, DEFAULT_PROFILE_SETTINGS.liveUpdates),
    notifyMentions: parseBoolean(notifyMentionsRaw, DEFAULT_PROFILE_SETTINGS.notifyMentions),
    notifyReplies: parseBoolean(notifyRepliesRaw, DEFAULT_PROFILE_SETTINGS.notifyReplies),
    weeklyDigest: parseBoolean(weeklyDigestRaw, DEFAULT_PROFILE_SETTINGS.weeklyDigest),
    profileVisibility,
    showOnlineStatus: parseBoolean(showOnlineRaw, DEFAULT_PROFILE_SETTINGS.showOnlineStatus),
    showContributionStats: parseBoolean(showStatsRaw, DEFAULT_PROFILE_SETTINGS.showContributionStats),
    shareActivityFeed: parseBoolean(shareActivityRaw, DEFAULT_PROFILE_SETTINGS.shareActivityFeed),
    accent
  };
}

export function saveProfileSettings(settings: ProfileSettings) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = normalizeProfileSettings(settings);

  window.localStorage.setItem(PROFILE_SETTINGS_KEYS.username, normalized.username);
  window.localStorage.setItem(PROFILE_SETTINGS_KEYS.displayName, normalized.displayName);
  window.localStorage.setItem(PROFILE_SETTINGS_KEYS.avatarDataUrl, normalized.avatarDataUrl);
  window.localStorage.setItem(PROFILE_SETTINGS_KEYS.headline, normalized.headline);
  window.localStorage.setItem(PROFILE_SETTINGS_KEYS.bio, normalized.bio);
  window.localStorage.setItem(PROFILE_SETTINGS_KEYS.focusTags, normalized.focusTags.join(","));
  window.localStorage.setItem(PROFILE_SETTINGS_KEYS.expertiseLevel, normalized.expertiseLevel);
  window.localStorage.setItem(PROFILE_SETTINGS_KEYS.defaultQuorum, normalized.defaultQuorum);
  window.localStorage.setItem(PROFILE_SETTINGS_KEYS.defaultSort, normalized.defaultSort);
  window.localStorage.setItem(PROFILE_SETTINGS_KEYS.autoAnalyze, String(normalized.autoAnalyze));
  window.localStorage.setItem(PROFILE_SETTINGS_KEYS.liveUpdates, String(normalized.liveUpdates));
  window.localStorage.setItem(PROFILE_SETTINGS_KEYS.notifyMentions, String(normalized.notifyMentions));
  window.localStorage.setItem(PROFILE_SETTINGS_KEYS.notifyReplies, String(normalized.notifyReplies));
  window.localStorage.setItem(PROFILE_SETTINGS_KEYS.weeklyDigest, String(normalized.weeklyDigest));
  window.localStorage.setItem(PROFILE_SETTINGS_KEYS.profileVisibility, normalized.profileVisibility);
  window.localStorage.setItem(PROFILE_SETTINGS_KEYS.showOnlineStatus, String(normalized.showOnlineStatus));
  window.localStorage.setItem(PROFILE_SETTINGS_KEYS.showContributionStats, String(normalized.showContributionStats));
  window.localStorage.setItem(PROFILE_SETTINGS_KEYS.shareActivityFeed, String(normalized.shareActivityFeed));
  window.localStorage.setItem(PROFILE_SETTINGS_KEYS.accent, normalized.accent);
  window.dispatchEvent(new Event(PROFILE_SETTINGS_EVENT));
}

export function normalizeProfileSettings(input: ProfileSettings): ProfileSettings {
  return {
    ...input,
    username: sanitizeUsername(input.username),
    displayName: normalizeText(input.displayName, DEFAULT_PROFILE_SETTINGS.displayName),
    avatarDataUrl: normalizeAvatarDataUrl(input.avatarDataUrl),
    headline: normalizeText(input.headline, DEFAULT_PROFILE_SETTINGS.headline),
    bio: normalizeText(input.bio, DEFAULT_PROFILE_SETTINGS.bio),
    focusTags: dedupeTags(input.focusTags)
  };
}

export function profileCompletion(settings: ProfileSettings): { value: number; total: number } {
  const checks = [
    Boolean(settings.avatarDataUrl),
    settings.displayName.trim().length >= 2,
    settings.username.trim().length >= 3,
    settings.headline.trim().length >= 6,
    settings.bio.trim().length >= 20,
    settings.focusTags.length >= 2,
    settings.profileVisibility !== "private"
  ];
  return {
    value: checks.filter(Boolean).length,
    total: checks.length
  };
}

export function profileSettingsSignature(settings: ProfileSettings): string {
  const normalized = normalizeProfileSettings(settings);
  return JSON.stringify(normalized);
}

export function sanitizeUsername(value: string): string {
  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "");
  return normalized || DEFAULT_PROFILE_SETTINGS.username;
}

export function profileInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return "U";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function profileAccentClasses(accent: AccentColor): string {
  if (accent === "indigo") {
    return "bg-indigo-100 text-indigo-700 border-indigo-200";
  }
  if (accent === "emerald") {
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  }
  if (accent === "amber") {
    return "bg-amber-100 text-amber-700 border-amber-200";
  }
  return "bg-teal-100 text-teal-700 border-teal-200";
}

function parseBoolean(value: string | null, fallback: boolean): boolean {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return fallback;
}

function parseTags(value: string | null, fallback: string[]): string[] {
  if (!value) {
    return fallback;
  }
  return dedupeTags(value.split(","));
}

function normalizeAvatarDataUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if (!trimmed.startsWith("data:image/")) {
    return "";
  }
  return trimmed;
}

function dedupeTags(tags: string[]): string[] {
  const normalized = tags
    .map((tag) => tag.trim().toLowerCase().replace(/\s+/g, "-"))
    .filter(Boolean);
  return [...new Set(normalized)];
}

function normalizeText(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function parseEnum<T extends string>(value: string | null, allowed: T[], fallback: T): T {
  if (value && allowed.includes(value as T)) {
    return value as T;
  }
  return fallback;
}
