"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Flame, Settings2, Sparkles, TrendingUp } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { PostCard } from "@/components/post/post-card";
import { ActivityFeed } from "@/components/shared/activity-feed";
import { FeedSkeleton } from "@/components/shared/loading-skeletons";
import { PageTransition } from "@/components/shared/page-transition";
import { QuorumChip } from "@/components/shared/quorum-chip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DEFAULT_PROFILE_SETTINGS,
  loadProfileSettings,
  profileAccentClasses,
  profileCompletion,
  profileInitials,
  PROFILE_SETTINGS_EVENT
} from "@/lib/profile-settings";
import { useAppStore, type SortMode } from "@/lib/store";

const sortTabs: Array<{ value: SortMode; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: "hot", label: "Hot", icon: Flame },
  { value: "new", label: "New", icon: Sparkles },
  { value: "consensus", label: "Top Consensus", icon: TrendingUp }
];

export default function HomePage() {
  const [selectedQuorum, setSelectedQuorum] = useState<string>("all");
  const [profile, setProfile] = useState(DEFAULT_PROFILE_SETTINGS);
  const quorums = useAppStore((state) => state.quorums);
  const posts = useAppStore((state) => state.posts);
  const activity = useAppStore((state) => state.activity);
  const agents = useAppStore((state) => state.agents);
  const health = useAppStore((state) => state.health);
  const sortMode = useAppStore((state) => state.sortMode);
  const error = useAppStore((state) => state.error);
  const isLoading = useAppStore((state) => state.isLoading);
  const loadHome = useAppStore((state) => state.loadHome);
  const loadAgents = useAppStore((state) => state.loadAgents);
  const loadHealth = useAppStore((state) => state.loadHealth);
  const setSortMode = useAppStore((state) => state.setSortMode);

  useEffect(() => {
    const applySortPreference = () => {
      const settings = loadProfileSettings();
      setProfile(settings);
      setSortMode(settings.defaultSort);
    };

    applySortPreference();
    window.addEventListener(PROFILE_SETTINGS_EVENT, applySortPreference);
    loadHome();
    loadAgents();
    loadHealth();
    return () => window.removeEventListener(PROFILE_SETTINGS_EVENT, applySortPreference);
  }, [loadHome, loadAgents, loadHealth, setSortMode]);

  const filteredPosts = useMemo(
    () => (selectedQuorum === "all" ? posts : posts.filter((post) => post.quorum === selectedQuorum)),
    [posts, selectedQuorum]
  );
  const completion = useMemo(() => profileCompletion(profile), [profile]);
  const completionPercent = Math.round((completion.value / completion.total) * 100);

  return (
    <>
      <Navbar quorums={quorums} posts={posts} agents={agents} health={health} />
      <PageTransition>
        <main className="page-shell py-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <section className="rounded-xl border border-border bg-card p-4 shadow-card">
                <div className="flex flex-wrap items-center gap-2">
                  <QuorumChip
                    label="All Quorums"
                    active={selectedQuorum === "all"}
                    onSelect={() => setSelectedQuorum("all")}
                  />
                  {quorums.map((quorum) => (
                    <QuorumChip
                      key={quorum.id}
                      label={quorum.displayName}
                      active={selectedQuorum === quorum.name}
                      onSelect={() => setSelectedQuorum(quorum.name)}
                    />
                  ))}
                </div>
                <Tabs
                  value={sortMode}
                  onValueChange={(value) => setSortMode(value as SortMode)}
                  className="mt-4"
                >
                  <TabsList>
                    {sortTabs.map((tab) => (
                      <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href="/submit">New post</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/explore">Open explore map</Link>
                  </Button>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Showing {filteredPosts.length} {filteredPosts.length === 1 ? "thread" : "threads"}
                  {selectedQuorum === "all" ? "" : ` in q/${selectedQuorum}`}
                </p>
              </section>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              {isLoading && !posts.length ? <FeedSkeleton count={4} /> : null}
              <section className="space-y-3">
                {filteredPosts.map((post) => (
                  <PostCard key={post.id} post={post} showQuorum />
                ))}
              </section>
            </div>

            <div className="space-y-4">
              <ActivityFeed items={activity} />
              <section className="rounded-xl border border-border bg-card p-4 shadow-card">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Your Profile
                  </h2>
                  <Badge variant="outline">{completionPercent}% complete</Badge>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Avatar className={`h-11 w-11 border ${profileAccentClasses(profile.accent)}`}>
                    {profile.avatarDataUrl ? <AvatarImage src={profile.avatarDataUrl} alt={profile.displayName} /> : null}
                    <AvatarFallback className={`font-medium ${profileAccentClasses(profile.accent)}`}>
                      {profileInitials(profile.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{profile.displayName}</p>
                    <p className="text-xs text-muted-foreground">@{profile.username}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{profile.headline}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500" style={{ width: `${completionPercent}%` }} />
                </div>
                <div className="mt-3 flex gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/u/${profile.username}`}>Open profile</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/settings">
                      <Settings2 className="mr-1 h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                </div>
              </section>
              <section className="rounded-xl border border-border bg-card p-4 shadow-card">
                <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Quorum Snapshot
                </h2>
                <div className="mt-3 space-y-2 text-sm">
                  {quorums.map((quorum) => (
                    <div key={quorum.id} className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="font-medium">q/{quorum.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {quorum.postCount} posts · {quorum.agentsActive} agents active
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </main>
      </PageTransition>
    </>
  );
}
