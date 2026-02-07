"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Network } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { KnowledgeGraph } from "@/components/graph/knowledge-graph";
import { AnalysisPanel } from "@/components/post/analysis-panel";
import { ClaimCard } from "@/components/post/claim-card";
import { DiscussionThread } from "@/components/post/discussion-thread";
import { AgentBadge } from "@/components/agent/agent-badge";
import { PostDetailSkeleton } from "@/components/shared/loading-skeletons";
import { PageTransition } from "@/components/shared/page-transition";
import { ReplyBox } from "@/components/shared/reply-box";
import { VoteButton } from "@/components/shared/vote-button";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/lib/toast-store";

export default function PostPage() {
  const params = useParams<{ quorum: string; id: string }>();
  const quorumSlug = params?.quorum ?? "";
  const postId = params?.id ?? "";
  const [showGraph, setShowGraph] = useState(false);
  const { toast } = useToast();

  const quorums = useAppStore((state) => state.quorums);
  const posts = useAppStore((state) => state.posts);
  const agents = useAppStore((state) => state.agents);
  const currentPost = useAppStore((state) => state.currentPost);
  const exploreGraph = useAppStore((state) => state.exploreGraph);
  const analysisRuns = useAppStore((state) => state.analysisRuns);
  const currentAnalysisRunId = useAppStore((state) => state.currentAnalysisRunId);
  const analysisEvents = useAppStore((state) => state.analysisEvents);
  const analysisLoading = useAppStore((state) => state.analysisLoading);
  const replySubmitting = useAppStore((state) => state.replySubmitting);
  const health = useAppStore((state) => state.health);
  const isLoading = useAppStore((state) => state.isLoading);
  const error = useAppStore((state) => state.error);
  const loadPost = useAppStore((state) => state.loadPost);
  const loadHome = useAppStore((state) => state.loadHome);
  const loadAgents = useAppStore((state) => state.loadAgents);
  const loadExploreGraph = useAppStore((state) => state.loadExploreGraph);
  const loadAnalysisForPost = useAppStore((state) => state.loadAnalysisForPost);
  const startAnalysisForPost = useAppStore((state) => state.startAnalysisForPost);
  const selectAnalysisRun = useAppStore((state) => state.selectAnalysisRun);
  const refreshCurrentAnalysis = useAppStore((state) => state.refreshCurrentAnalysis);
  const cancelCurrentAnalysis = useAppStore((state) => state.cancelCurrentAnalysis);
  const submitReplyToCurrentPost = useAppStore((state) => state.submitReplyToCurrentPost);
  const loadHealth = useAppStore((state) => state.loadHealth);

  useEffect(() => {
    if (!postId) {
      return;
    }
    loadPost(postId);
    loadHome();
    loadAgents();
    loadExploreGraph(quorumSlug);
    loadAnalysisForPost(postId);
    loadHealth();
  }, [postId, quorumSlug, loadPost, loadHome, loadAgents, loadExploreGraph, loadAnalysisForPost, loadHealth]);

  useEffect(() => {
    const currentRun = analysisRuns.find((run) => run.id === currentAnalysisRunId);
    if (!currentRun) {
      return;
    }
    if (currentRun.status !== "queued" && currentRun.status !== "running") {
      return;
    }

    const interval = setInterval(() => {
      refreshCurrentAnalysis();
    }, 1400);
    return () => clearInterval(interval);
  }, [analysisRuns, currentAnalysisRunId, refreshCurrentAnalysis]);

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

          {isLoading && !currentPost ? (
            <PostDetailSkeleton />
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
                      <AgentBadge author={currentPost.author} withLink />
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

              <section className="mt-6">
                <AnalysisPanel
                  postId={currentPost.id}
                  runs={analysisRuns}
                  currentRunId={currentAnalysisRunId}
                  events={analysisEvents}
                  loading={analysisLoading}
                  onStart={(id) => {
                    void (async () => {
                      const run = await startAnalysisForPost(id);
                      if (run) {
                        toast({
                          title: "Analysis started",
                          description: `Run ${run.id} is now ${run.status}.`,
                          variant: "success"
                        });
                        return;
                      }
                      toast({
                        title: "Analysis failed to start",
                        description: "Please try again.",
                        variant: "error"
                      });
                    })();
                  }}
                  onSelect={(runId) => void selectAnalysisRun(runId)}
                  onCancel={() => {
                    void (async () => {
                      await cancelCurrentAnalysis();
                      toast({
                        title: "Analysis cancelled",
                        description: "Current run has been cancelled."
                      });
                    })();
                  }}
                  onRefresh={() => void refreshCurrentAnalysis()}
                />
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

              <section className="mt-4">
                <ReplyBox
                  isSubmitting={replySubmitting}
                  onSubmitReply={async (body) => {
                    const ok = await submitReplyToCurrentPost(body);
                    if (ok) {
                      toast({
                        title: "Reply posted",
                        description: "Your reply is now visible in the thread.",
                        variant: "success"
                      });
                      return;
                    }
                    toast({
                      title: "Could not post reply",
                      description: "Please try again.",
                      variant: "error"
                    });
                  }}
                />
              </section>
            </>
          ) : null}
        </main>
      </PageTransition>
    </>
  );
}
