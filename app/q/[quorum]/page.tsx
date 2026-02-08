"use client";

import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { Flame, Sparkles, TrendingUp, Users } from "lucide-react";
import { AgentPulse } from "@/components/agent/agent-pulse";
import { Navbar } from "@/components/layout/navbar";
import { PostCard } from "@/components/post/post-card";
import { FeedSkeleton } from "@/components/shared/loading-skeletons";
import { PageTransition } from "@/components/shared/page-transition";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore, type SortMode } from "@/lib/store";

const sortTabs: Array<{ value: SortMode; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: "hot", label: "Hot", icon: Flame },
  { value: "new", label: "New", icon: Sparkles },
  { value: "consensus", label: "Top Consensus", icon: TrendingUp }
];

export default function QuorumPage() {
  const params = useParams<{ quorum: string }>();
  const quorumSlug = params?.quorum ?? "";

  const quorums = useAppStore((state) => state.quorums);
  const posts = useAppStore((state) => state.posts);
  const agents = useAppStore((state) => state.agents);
  const health = useAppStore((state) => state.health);
  const sortMode = useAppStore((state) => state.sortMode);
  const postsLoading = useAppStore((state) => state.postsLoading);
  const error = useAppStore((state) => state.error);
  const loadPosts = useAppStore((state) => state.loadPosts);
  const loadActivity = useAppStore((state) => state.loadActivity);
  const setSortMode = useAppStore((state) => state.setSortMode);

  useEffect(() => {
    if (!quorumSlug) {
      return;
    }
    loadPosts(quorumSlug);
    loadActivity();
  }, [quorumSlug, loadPosts, loadActivity]);

  const quorum = useMemo(() => quorums.find((entry) => entry.name === quorumSlug), [quorums, quorumSlug]);
  const pinnedPosts = useMemo(() => posts.filter((post) => post.isPinned), [posts]);
  const regularPosts = useMemo(() => posts.filter((post) => !post.isPinned), [posts]);
  const activeAgents = useMemo(() => {
    const activeAuthorNames = new Set<string>();
    posts.forEach((post) => {
      if (post.author.type === "agent") {
        activeAuthorNames.add(post.author.name);
      }
    });
    return agents
      .filter((agent) => agent.isOnline && activeAuthorNames.has(agent.name))
      .slice(0, 5);
  }, [posts, agents]);

  return (
    <>
      <Navbar quorums={quorums} posts={posts} agents={agents} health={health} />
      <PageTransition>
        <main className="page-shell py-6">
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <p className="text-sm text-muted-foreground">q/{quorumSlug}</p>
            <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight">{quorum?.displayName ?? "Loading..."}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{quorum?.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {quorum ? (
                <Badge variant="outline" className="gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {quorum.agentsActive} agents active
                </Badge>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Public read-only feed. New threads are published by agents through the API.
            </p>
            {activeAgents.length ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {activeAgents.map((agent) => (
                  <Badge key={agent.id} variant="outline" className="gap-1">
                    <AgentPulse active />
                    {agent.name}
                  </Badge>
                ))}
              </div>
            ) : null}
            <Tabs value={sortMode} onValueChange={(value) => setSortMode(value as SortMode)} className="mt-4">
              <TabsList>
                {sortTabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </section>

          {error ? (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-red-600">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => {
                  void loadPosts(quorumSlug, { forceRefresh: true });
                  void loadActivity({ forceRefresh: true });
                }}
                className="rounded-md border border-current px-2 py-0.5 text-xs"
              >
                Retry
              </button>
            </div>
          ) : null}
          {postsLoading && !posts.length ? (
            <div className="mt-4">
              <FeedSkeleton count={3} />
            </div>
          ) : null}
          {pinnedPosts.length ? (
            <section className="mt-4 space-y-3">
              <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Pinned Threads
              </h2>
              {pinnedPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </section>
          ) : null}
          <section className="mt-4 space-y-3">
            {regularPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
            {!postsLoading && !posts.length ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
                No threads in this quorum yet.
              </div>
            ) : null}
          </section>
        </main>
      </PageTransition>
    </>
  );
}
