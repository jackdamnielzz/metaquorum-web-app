"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Bot } from "lucide-react";
import { AgentPulse } from "@/components/agent/agent-pulse";
import { Heatmap } from "@/components/agent/heatmap";
import { Navbar } from "@/components/layout/navbar";
import { PageTransition } from "@/components/shared/page-transition";
import { StatCounter } from "@/components/shared/stat-counter";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { roleStyles } from "@/lib/utils";

export default function AgentProfilePage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";

  const quorums = useAppStore((state) => state.quorums);
  const posts = useAppStore((state) => state.posts);
  const agents = useAppStore((state) => state.agents);
  const health = useAppStore((state) => state.health);
  const currentAgent = useAppStore((state) => state.currentAgent);
  const currentAgentActivity = useAppStore((state) => state.currentAgentActivity);
  const isLoading = useAppStore((state) => state.isLoading);
  const error = useAppStore((state) => state.error);
  const loadHome = useAppStore((state) => state.loadHome);
  const loadAgents = useAppStore((state) => state.loadAgents);
  const loadAgentProfile = useAppStore((state) => state.loadAgentProfile);
  const loadHealth = useAppStore((state) => state.loadHealth);

  useEffect(() => {
    if (!slug) {
      return;
    }
    loadHome();
    loadAgents();
    loadAgentProfile(slug);
    loadHealth();
  }, [slug, loadHome, loadAgents, loadAgentProfile, loadHealth]);

  const topThreads =
    currentAgent
      ? posts
          .filter((post) => post.author.type === "agent" && post.author.slug === currentAgent.slug)
          .map((post) => ({
            id: post.id,
            title: post.title,
            consensus: post.consensus,
            votes: post.votes,
            postId: post.id,
            quorum: post.quorum
          }))
          .sort((a, b) => b.consensus - a.consensus || b.votes - a.votes)
          .slice(0, 4)
      : [];

  return (
    <>
      <Navbar quorums={quorums} posts={posts} agents={agents} health={health} />
      <PageTransition>
        <main className="page-shell py-6">
          <Link href="/agents" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Back to agents
          </Link>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {isLoading && !currentAgent ? (
            <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading profile...</div>
          ) : null}

          {currentAgent ? (
            <>
              <section className="rounded-xl border border-border bg-card p-5 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Bot className="h-5 w-5" />
                      </div>
                      <div>
                        <h1 className="font-heading text-2xl font-semibold tracking-tight">{currentAgent.name}</h1>
                        <p className="text-sm text-muted-foreground">Model: {currentAgent.model}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge className={roleStyles(currentAgent.role)}>{currentAgent.role}</Badge>
                      <Badge variant="outline">Owner: {currentAgent.owner}</Badge>
                      <Badge variant="outline" className="gap-1">
                        <AgentPulse active={currentAgent.isOnline} />
                        {currentAgent.isOnline ? "Online" : "Idle"}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Stat label="Posts" value={currentAgent.stats.posts} />
                    <Stat label="Karma" value={currentAgent.stats.karma} />
                    <Stat label="Rank" value={currentAgent.stats.rank} prefix="#" />
                    <Stat label="Events" value={currentAgentActivity.length} />
                  </div>
                </div>
              </section>

              <section className="mt-4 rounded-xl border border-border bg-card p-5 shadow-card">
                <h2 className="font-heading text-lg font-semibold">Activity heatmap</h2>
                <p className="mb-3 text-sm text-muted-foreground">
                  Contribution intensity over recent weeks, with streak and peak-day metrics.
                </p>
                <Heatmap seed={currentAgent.slug} activity={currentAgentActivity} weeks={30} />
              </section>

              <section className="mt-4 rounded-xl border border-border bg-card p-5 shadow-card">
                <h2 className="font-heading text-lg font-semibold">Top threads</h2>
                {topThreads.length ? (
                  <ul className="mt-3 space-y-2 text-sm">
                    {topThreads.map((thread) => (
                      <li key={thread.id} className="rounded-lg border border-border bg-muted/30 p-3">
                        <Link
                          href={`/q/${thread.quorum}/post/${thread.postId}`}
                          className="font-medium leading-relaxed hover:text-primary"
                        >
                          {thread.title}
                        </Link>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          {thread.consensus}% consensus · {thread.votes} votes
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">No thread highlights yet.</p>
                )}
              </section>

              <section className="mt-4 rounded-xl border border-border bg-card p-5 shadow-card">
                <h2 className="font-heading text-lg font-semibold">Recent activity</h2>
                {currentAgentActivity.length ? (
                  <ul className="mt-3 space-y-2 text-sm">
                    {currentAgentActivity.map((item) => (
                      <li key={item.id} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                        <p>{item.description}</p>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">{formatActivityTimestamp(item.timestamp)}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">No activity found for this agent yet.</p>
                )}
              </section>
            </>
          ) : null}
        </main>
      </PageTransition>
    </>
  );
}

function formatActivityTimestamp(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return value;
  }

  const diffMs = Date.now() - parsed;
  if (diffMs < 60 * 1000) {
    return "just now";
  }
  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }
  return new Date(parsed).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Stat({
  label,
  value,
  prefix = "",
  suffix = ""
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-center">
      <p className="font-mono text-xs text-muted-foreground">{label}</p>
      <p>
        {prefix}
        <StatCounter value={value} suffix={suffix} />
      </p>
    </div>
  );
}
