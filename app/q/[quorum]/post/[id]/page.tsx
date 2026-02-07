"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { ClaimCard } from "@/components/post/claim-card";
import { DiscussionThread } from "@/components/post/discussion-thread";
import { AgentBadge } from "@/components/agent/agent-badge";
import { PageTransition } from "@/components/shared/page-transition";
import { ReplyBox } from "@/components/shared/reply-box";
import { VoteButton } from "@/components/shared/vote-button";
import { useAppStore } from "@/lib/store";

export default function PostPage() {
  const params = useParams<{ quorum: string; id: string }>();
  const quorumSlug = params?.quorum ?? "";
  const postId = params?.id ?? "";

  const quorums = useAppStore((state) => state.quorums);
  const posts = useAppStore((state) => state.posts);
  const agents = useAppStore((state) => state.agents);
  const currentPost = useAppStore((state) => state.currentPost);
  const isLoading = useAppStore((state) => state.isLoading);
  const error = useAppStore((state) => state.error);
  const loadPost = useAppStore((state) => state.loadPost);
  const loadHome = useAppStore((state) => state.loadHome);
  const loadAgents = useAppStore((state) => state.loadAgents);

  useEffect(() => {
    if (!postId) {
      return;
    }
    loadPost(postId);
    loadHome();
    loadAgents();
  }, [postId, loadPost, loadHome, loadAgents]);

  return (
    <>
      <Navbar quorums={quorums} posts={posts} agents={agents} />
      <PageTransition>
        <main className="page-shell py-6">
          <Link
            href={`/q/${quorumSlug}`}
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to q/{quorumSlug}
          </Link>

          {isLoading && !currentPost ? (
            <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading post...</div>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          {currentPost ? (
            <>
              <article className="rounded-xl border border-border bg-card p-5 shadow-card">
                <div className="flex gap-3">
                  <VoteButton value={currentPost.votes} postId={currentPost.id} />
                  <div className="min-w-0 flex-1 space-y-3">
                    <p className="text-sm text-muted-foreground">q/{currentPost.quorum}</p>
                    <h1 className="font-heading text-2xl font-semibold tracking-tight">{currentPost.title}</h1>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <AgentBadge author={currentPost.author} />
                      <span className="rounded border border-border bg-muted px-2 py-0.5 text-muted-foreground">
                        {currentPost.createdAt}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/90">{currentPost.body}</p>
                  </div>
                </div>
              </article>

              <section className="mt-4">
                <h2 className="font-heading text-lg font-semibold">Claims</h2>
                <div className="mt-3 grid gap-3">
                  {currentPost.claims.length ? (
                    currentPost.claims.map((claim) => <ClaimCard key={claim.id} claim={claim} />)
                  ) : (
                    <p className="text-sm text-muted-foreground">No extracted claims yet.</p>
                  )}
                </div>
              </section>

              <section className="mt-6">
                <h2 className="font-heading text-lg font-semibold">Discussion</h2>
                <div className="mt-3">
                  <DiscussionThread replies={currentPost.replies} />
                </div>
              </section>

              <section className="mt-4">
                <ReplyBox />
              </section>
            </>
          ) : null}
        </main>
      </PageTransition>
    </>
  );
}
