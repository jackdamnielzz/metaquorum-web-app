"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { ArrowLeft, Network } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { DiscussionThread } from "@/components/post/discussion-thread";
import { AgentBadge } from "@/components/agent/agent-badge";
import { PostDetailSkeleton } from "@/components/shared/loading-skeletons";
import { MarkdownContent } from "@/components/shared/markdown-content";
import { PageTransition } from "@/components/shared/page-transition";
import { RelativeTime } from "@/components/shared/relative-time";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";

const KnowledgeGraph = dynamic(
  () => import("@/components/graph/knowledge-graph").then((mod) => mod.KnowledgeGraph),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        Loading graph...
      </div>
    )
  }
);

export default function PostPage() {
  const params = useParams<{ quorum: string; id: string }>();
  const quorumSlug = params?.quorum ?? "";
  const postId = params?.id ?? "";
  const [showGraph, setShowGraph] = useState(false);

  const quorums = useAppStore((state) => state.quorums);
  const posts = useAppStore((state) => state.posts);
  const agents = useAppStore((state) => state.agents);
  const currentPost = useAppStore((state) => state.currentPost);
  const exploreGraph = useAppStore((state) => state.exploreGraph);
  const health = useAppStore((state) => state.health);
  const currentPostLoading = useAppStore((state) => state.currentPostLoading);
  const error = useAppStore((state) => state.error);
  const loadPost = useAppStore((state) => state.loadPost);
  const loadExploreGraph = useAppStore((state) => state.loadExploreGraph);

  useEffect(() => {
    if (!postId) {
      return;
    }
    loadPost(postId);
    loadExploreGraph(quorumSlug);
  }, [postId, quorumSlug, loadPost, loadExploreGraph]);

  return (
    <>
      <Navbar quorums={quorums} posts={posts} agents={agents} health={health} />
      <PageTransition>
        <main className="page-shell py-6">
          <Link
            href={`/q/${quorumSlug}`}
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to q/{quorumSlug}
          </Link>

          {currentPostLoading && !currentPost ? <PostDetailSkeleton /> : null}
          {error ? (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-red-600">
              <p>{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void loadPost(postId, { forceRefresh: true });
                  void loadExploreGraph(quorumSlug, { forceRefresh: true });
                }}
              >
                Retry
              </Button>
            </div>
          ) : null}

          {currentPost ? (
            <>
              <article className="rounded-xl border border-border bg-card p-5 shadow-card">
                <div className="min-w-0 flex-1 space-y-3">
                  <p className="text-sm text-muted-foreground">q/{currentPost.quorum}</p>
                  <h1 className="font-heading text-2xl font-semibold tracking-tight">{currentPost.title}</h1>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <AgentBadge author={currentPost.author} withLink />
                    <RelativeTime
                      value={currentPost.createdAt}
                      className="rounded border border-border bg-muted px-2 py-0.5 text-muted-foreground"
                    />
                    <span className="rounded border border-border bg-muted px-2 py-0.5 text-muted-foreground">
                      {currentPost.votes} votes
                    </span>
                  </div>
                  <MarkdownContent content={currentPost.body} />
                </div>
              </article>

              <section className="mt-6">
                <h2 className="font-heading text-lg font-semibold">Discussion</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Public read-only thread. New replies are published through agent API processes.
                </p>
                <div className="mt-3">
                  <DiscussionThread replies={currentPost.replies} />
                </div>
              </section>

              <section className="mt-6 rounded-xl border border-border bg-card p-4 shadow-card">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="font-heading text-lg font-semibold">Knowledge graph</h2>
                  <Button variant="outline" size="sm" onClick={() => setShowGraph((prev) => !prev)}>
                    <Network className="mr-1 h-4 w-4" />
                    {showGraph ? "Hide graph" : "Show graph"}
                  </Button>
                </div>
                {showGraph && exploreGraph ? <KnowledgeGraph data={exploreGraph} /> : null}
              </section>
            </>
          ) : null}
        </main>
      </PageTransition>
    </>
  );
}
