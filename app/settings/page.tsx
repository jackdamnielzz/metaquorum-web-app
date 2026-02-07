"use client";

import { useEffect, useState } from "react";
import { FlaskConical, RotateCcw, Save } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { PageTransition } from "@/components/shared/page-transition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_PROFILE_SETTINGS,
  ProfileSettings,
  profileAccentClasses,
  profileInitials,
  saveProfileSettings,
  loadProfileSettings,
  sanitizeUsername,
  normalizeProfileSettings
} from "@/lib/profile-settings";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/lib/toast-store";

const expertiseOptions: Array<{ value: ProfileSettings["expertiseLevel"]; label: string }> = [
  { value: "researcher", label: "Researcher" },
  { value: "builder", label: "Builder" },
  { value: "clinician", label: "Clinician" },
  { value: "student", label: "Student" }
];

const visibilityOptions: Array<{ value: ProfileSettings["profileVisibility"]; label: string }> = [
  { value: "public", label: "Public" },
  { value: "quorum_only", label: "Quorum only" },
  { value: "private", label: "Private" }
];

const accentOptions: Array<{ value: ProfileSettings["accent"]; label: string }> = [
  { value: "teal", label: "Teal" },
  { value: "indigo", label: "Indigo" },
  { value: "emerald", label: "Emerald" },
  { value: "amber", label: "Amber" }
];

const sortOptions: Array<{ value: ProfileSettings["defaultSort"]; label: string }> = [
  { value: "hot", label: "Hot" },
  { value: "new", label: "New" },
  { value: "consensus", label: "Top Consensus" }
];

export default function SettingsPage() {
  const { toast } = useToast();
  const quorums = useAppStore((state) => state.quorums);
  const posts = useAppStore((state) => state.posts);
  const agents = useAppStore((state) => state.agents);
  const health = useAppStore((state) => state.health);
  const loadHome = useAppStore((state) => state.loadHome);
  const loadAgents = useAppStore((state) => state.loadAgents);
  const loadHealth = useAppStore((state) => state.loadHealth);

  const [tab, setTab] = useState<"profile" | "workspace" | "privacy">("profile");
  const [profile, setProfile] = useState<ProfileSettings>(DEFAULT_PROFILE_SETTINGS);
  const [focusTagDraft, setFocusTagDraft] = useState("");
  const useMockApi = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

  useEffect(() => {
    loadHome();
    loadAgents();
    loadHealth();
  }, [loadHome, loadAgents, loadHealth]);

  useEffect(() => {
    setProfile(loadProfileSettings());
  }, []);

  function updateProfile<K extends keyof ProfileSettings>(key: K, value: ProfileSettings[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  function addFocusTag(raw: string) {
    const normalized = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (!normalized) {
      return;
    }
    setProfile((prev) => ({
      ...prev,
      focusTags: prev.focusTags.includes(normalized) ? prev.focusTags : [...prev.focusTags, normalized]
    }));
    setFocusTagDraft("");
  }

  function removeFocusTag(tag: string) {
    setProfile((prev) => ({
      ...prev,
      focusTags: prev.focusTags.filter((entry) => entry !== tag)
    }));
  }

  function onSave() {
    const normalized = normalizeProfileSettings(profile);
    saveProfileSettings(normalized);
    setProfile(normalized);
    toast({
      title: "Profile settings saved",
      description: "Your account configuration and workspace preferences were updated.",
      variant: "success"
    });
  }

  function onResetDefaults() {
    setProfile(DEFAULT_PROFILE_SETTINGS);
    saveProfileSettings(DEFAULT_PROFILE_SETTINGS);
    toast({
      title: "Defaults restored",
      description: "Profile settings were reset to recommended defaults."
    });
  }

  return (
    <>
      <Navbar quorums={quorums} posts={posts} agents={agents} health={health} />
      <PageTransition>
        <main className="page-shell py-6">
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-heading text-2xl font-semibold tracking-tight">Profile Setup</h1>
                <p className="text-sm text-muted-foreground">
                  Configure your identity, workflow preferences and privacy controls.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <FlaskConical className="h-3.5 w-3.5" />
                  {useMockApi ? "Mock API mode" : "Backend-first mode"}
                </Badge>
                <Badge variant="outline">@{sanitizeUsername(profile.username)}</Badge>
              </div>
            </div>
          </section>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_290px]">
            <section className="rounded-xl border border-border bg-card p-5 shadow-card">
              <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
                <TabsList>
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="workspace">Workspace</TabsTrigger>
                  <TabsTrigger value="privacy">Privacy & alerts</TabsTrigger>
                </TabsList>
              </Tabs>

              {tab === "profile" ? (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor="displayName" className="text-sm font-medium">
                        Display name
                      </label>
                      <Input
                        id="displayName"
                        value={profile.displayName}
                        onChange={(event) => updateProfile("displayName", event.target.value)}
                        placeholder="Your display name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="username" className="text-sm font-medium">
                        Username
                      </label>
                      <Input
                        id="username"
                        value={profile.username}
                        onChange={(event) => updateProfile("username", sanitizeUsername(event.target.value))}
                        placeholder="username"
                      />
                      <p className="text-xs text-muted-foreground">Used for `/u/{sanitizeUsername(profile.username)}`.</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="headline" className="text-sm font-medium">
                      Headline
                    </label>
                    <Input
                      id="headline"
                      value={profile.headline}
                      onChange={(event) => updateProfile("headline", event.target.value)}
                      placeholder="One-line profile summary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="bio" className="text-sm font-medium">
                      Bio
                    </label>
                    <Textarea
                      id="bio"
                      value={profile.bio}
                      onChange={(event) => updateProfile("bio", event.target.value)}
                      placeholder="Describe your research focus, methods and goals."
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor="expertise" className="text-sm font-medium">
                        Expertise level
                      </label>
                      <Select
                        value={profile.expertiseLevel}
                        onValueChange={(value) => updateProfile("expertiseLevel", value as ProfileSettings["expertiseLevel"])}
                      >
                        <SelectTrigger id="expertise">
                          <SelectValue placeholder="Select expertise" />
                        </SelectTrigger>
                        <SelectContent>
                          {expertiseOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="accent" className="text-sm font-medium">
                        Accent color
                      </label>
                      <Select
                        value={profile.accent}
                        onValueChange={(value) => updateProfile("accent", value as ProfileSettings["accent"])}
                      >
                        <SelectTrigger id="accent">
                          <SelectValue placeholder="Accent" />
                        </SelectTrigger>
                        <SelectContent>
                          {accentOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="focusTags" className="text-sm font-medium">
                      Focus tags
                    </label>
                    <div className="flex gap-2">
                      <Input
                        id="focusTags"
                        value={focusTagDraft}
                        onChange={(event) => setFocusTagDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === ",") {
                            event.preventDefault();
                            addFocusTag(focusTagDraft);
                          }
                        }}
                        placeholder="Add focus tag and press Enter"
                      />
                      <Button type="button" variant="outline" onClick={() => addFocusTag(focusTagDraft)}>
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.focusTags.length ? (
                        profile.focusTags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => removeFocusTag(tag)}
                            className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs hover:bg-muted"
                          >
                            {tag} ×
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">No focus tags added yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {tab === "workspace" ? (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor="defaultQuorum" className="text-sm font-medium">
                        Default quorum
                      </label>
                      <Select
                        value={profile.defaultQuorum}
                        onValueChange={(value) => updateProfile("defaultQuorum", value)}
                      >
                        <SelectTrigger id="defaultQuorum">
                          <SelectValue placeholder="Select quorum" />
                        </SelectTrigger>
                        <SelectContent>
                          {quorums.map((quorum) => (
                            <SelectItem key={quorum.id} value={quorum.name}>
                              {quorum.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="defaultSort" className="text-sm font-medium">
                        Default feed sort
                      </label>
                      <Select
                        value={profile.defaultSort}
                        onValueChange={(value) => updateProfile("defaultSort", value as ProfileSettings["defaultSort"])}
                      >
                        <SelectTrigger id="defaultSort">
                          <SelectValue placeholder="Select feed sort" />
                        </SelectTrigger>
                        <SelectContent>
                          {sortOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                    <ToggleRow
                      label="Auto-request analysis on submit"
                      description="Automatically starts analysis when opening a new thread."
                      checked={profile.autoAnalyze}
                      onChange={(checked) => updateProfile("autoAnalyze", checked)}
                    />
                    <ToggleRow
                      label="Live updates"
                      description="Enables SSE updates with automatic polling fallback."
                      checked={profile.liveUpdates}
                      onChange={(checked) => updateProfile("liveUpdates", checked)}
                    />
                    <ToggleRow
                      label="Show contribution stats"
                      description="Display post/vote/reply stats on your profile header."
                      checked={profile.showContributionStats}
                      onChange={(checked) => updateProfile("showContributionStats", checked)}
                    />
                  </div>
                </div>
              ) : null}

              {tab === "privacy" ? (
                <div className="mt-4 space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="visibility" className="text-sm font-medium">
                      Profile visibility
                    </label>
                    <Select
                      value={profile.profileVisibility}
                      onValueChange={(value) => updateProfile("profileVisibility", value as ProfileSettings["profileVisibility"])}
                    >
                      <SelectTrigger id="visibility">
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        {visibilityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4">
                    <ToggleRow
                      label="Show online status"
                      description="Lets others see when you are currently active."
                      checked={profile.showOnlineStatus}
                      onChange={(checked) => updateProfile("showOnlineStatus", checked)}
                    />
                    <ToggleRow
                      label="Share activity feed events"
                      description="Include your actions in the global live activity stream."
                      checked={profile.shareActivityFeed}
                      onChange={(checked) => updateProfile("shareActivityFeed", checked)}
                    />
                    <ToggleRow
                      label="Notify on mentions"
                      description="Creates notification entries when your username is mentioned."
                      checked={profile.notifyMentions}
                      onChange={(checked) => updateProfile("notifyMentions", checked)}
                    />
                    <ToggleRow
                      label="Notify on replies"
                      description="Creates notification entries for replies in your threads."
                      checked={profile.notifyReplies}
                      onChange={(checked) => updateProfile("notifyReplies", checked)}
                    />
                    <ToggleRow
                      label="Weekly digest"
                      description="Shows a weekly activity summary card in your notification panel."
                      checked={profile.weeklyDigest}
                      onChange={(checked) => updateProfile("weeklyDigest", checked)}
                    />
                  </div>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                <Button type="button" variant="outline" onClick={onResetDefaults}>
                  <RotateCcw className="mr-1 h-4 w-4" />
                  Reset defaults
                </Button>
                <Button type="button" onClick={onSave}>
                  <Save className="mr-1 h-4 w-4" />
                  Save profile settings
                </Button>
              </div>
            </section>

            <aside className="space-y-4">
              <section className="rounded-xl border border-border bg-card p-4 shadow-card">
                <p className="font-mono text-xs uppercase text-muted-foreground">Preview</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className={`grid h-12 w-12 place-items-center rounded-full border font-semibold ${profileAccentClasses(profile.accent)}`}>
                    {profileInitials(profile.displayName)}
                  </div>
                  <div>
                    <p className="font-heading text-lg font-semibold leading-tight">{profile.displayName}</p>
                    <p className="text-xs text-muted-foreground">@{sanitizeUsername(profile.username)}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{profile.headline}</p>
                <p className="mt-2 text-xs text-muted-foreground">{profile.bio}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge variant="outline">{profile.expertiseLevel}</Badge>
                  <Badge variant="outline">{profile.profileVisibility}</Badge>
                  {profile.focusTags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="outline">#{tag}</Badge>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-border bg-card p-4 shadow-card">
                <p className="font-mono text-xs uppercase text-muted-foreground">Applied behavior</p>
                <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
                  <li>New posts use `@{sanitizeUsername(profile.username)}` as author.</li>
                  <li>Submit opens with default quorum `q/{profile.defaultQuorum}`.</li>
                  <li>Live update loops are {profile.liveUpdates ? "enabled" : "disabled"}.</li>
                  <li>Auto analysis is {profile.autoAnalyze ? "enabled" : "disabled"}.</li>
                </ul>
              </section>
            </aside>
          </div>
        </main>
      </PageTransition>
    </>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
      />
    </label>
  );
}
