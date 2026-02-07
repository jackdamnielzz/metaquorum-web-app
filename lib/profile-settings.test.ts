import { describe, expect, it } from "vitest";
import {
  normalizeProfileSettings,
  profileAccentClasses,
  profileCompletion,
  profileInitials,
  profileSettingsSignature,
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
      avatarDataUrl: "data:image/png;base64,abc",
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

describe("profileCompletion", () => {
  it("returns completed score for configured profiles", () => {
    const completion = profileCompletion({
      username: "niels",
      displayName: "Niels",
      avatarDataUrl: "data:image/png;base64,abc",
      headline: "Clinical evidence reviewer",
      bio: "I review trial quality, endpoints and practical implementation risks.",
      focusTags: ["oncology", "trial-design"],
      expertiseLevel: "researcher",
      defaultQuorum: "cancer",
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
    expect(completion.total).toBe(7);
    expect(completion.value).toBe(7);
  });
});

describe("profileSettingsSignature", () => {
  it("produces stable signature for equivalent input", () => {
    const a = profileSettingsSignature({
      username: "Niels",
      displayName: "Niels",
      avatarDataUrl: "data:image/png;base64,abc",
      headline: "Research",
      bio: "Bio",
      focusTags: ["trial-design", "oncology"],
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
    const b = profileSettingsSignature({
      username: "niels",
      displayName: "Niels",
      avatarDataUrl: "data:image/png;base64,abc",
      headline: "Research",
      bio: "Bio",
      focusTags: ["trial-design", "oncology"],
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
    expect(a).toBe(b);
  });
});
