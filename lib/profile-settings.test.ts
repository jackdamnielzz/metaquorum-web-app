import { describe, expect, it } from "vitest";
import {
  normalizeProfileSettings,
  profileAccentClasses,
  profileInitials,
  sanitizeUsername
} from "./profile-settings";

describe("sanitizeUsername", () => {
  it("normalizes casing and strips unsupported chars", () => {
    expect(sanitizeUsername("  Dr. Alice / 2026 ")).toBe("dr.-alice-2026");
  });

  it("falls back when value becomes empty", () => {
    expect(sanitizeUsername("!!!")).toBe("eduard");
  });
});

describe("profileInitials", () => {
  it("returns initials for multi-word names", () => {
    expect(profileInitials("Alice Cooper")).toBe("AC");
  });

  it("returns two letters for one-word names", () => {
    expect(profileInitials("Niels")).toBe("NI");
  });
});

describe("normalizeProfileSettings", () => {
  it("deduplicates and normalizes focus tags", () => {
    const output = normalizeProfileSettings({
      username: "Niels",
      displayName: "Niels",
      headline: "Research",
      bio: "Bio",
      focusTags: ["Trial Design", "trial-design", "oncology "],
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
    });
    expect(output.username).toBe("niels");
    expect(output.focusTags).toEqual(["trial-design", "oncology"]);
  });
});

describe("profileAccentClasses", () => {
  it("maps accent enums to class strings", () => {
    expect(profileAccentClasses("indigo")).toContain("indigo");
    expect(profileAccentClasses("emerald")).toContain("emerald");
  });
});
