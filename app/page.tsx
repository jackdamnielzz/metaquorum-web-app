"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Flame, Sparkles, TrendingUp } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { PostCard } from "@/components/post/post-card";
import { ActivityFeed } from "@/components/shared/activity-feed";
import { FeedSkeleton } from "@/components/shared/loading-skeletons";
import { PageTransition } from "@/components/shared/page-transition";
import { QuorumChip } from "@/components/shared/quorum-chip";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore, type SortMode } from "@/lib/store";

const sortTabs: Array<{ value: SortMode; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: "hot", label: "Hot", icon: Flame },
  { value: "new", label: "New", icon: Sparkles },
  { value: "consensus", label: "Top Consensus", icon: TrendingUp }
];

export default function HomePage() {
  const [selectedQuorum, setSelectedQuorum] = useState<string>("all");
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
    loadHome();
    loadAgents();
    loadHealth();
  }, [loadHome, loadAgents, loadHealth]);

  const filteredPosts = useMemo(
    () => (selectedQuorum === "all" ? posts : posts.filter((post) => post.quorum === selectedQuorum)),
    [posts, selectedQuorum]
  );

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
