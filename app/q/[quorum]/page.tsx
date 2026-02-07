"use client";

import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { Users } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { PostCard } from "@/components/post/post-card";
import { PageTransition } from "@/components/shared/page-transition";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";

export default function QuorumPage() {
  const params = useParams<{ quorum: string }>();
  const quorumSlug = params?.quorum ?? "";

  const quorums = useAppStore((state) => state.quorums);
  const posts = useAppStore((state) => state.posts);
  const agents = useAppStore((state) => state.agents);
  const isLoading = useAppStore((state) => state.isLoading);
  const error = useAppStore((state) => state.error);
  const loadQuorum = useAppStore((state) => state.loadQuorum);
  const loadAgents = useAppStore((state) => state.loadAgents);

  useEffect(() => {
    if (!quorumSlug) {
      return;
    }
    loadQuorum(quorumSlug);
    loadAgents();
  }, [quorumSlug, loadQuorum, loadAgents]);

  const quorum = useMemo(() => quorums.find((entry) => entry.name === quorumSlug), [quorums, quorumSlug]);

  return (
    <>
      <Navbar quorums={quorums} posts={posts} agents={agents} />
      <PageTransition>
        <main className="page-shell py-6">
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <p className="text-sm text-muted-foreground">q/{quorumSlug}</p>
            <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight">{quorum?.displayName ?? "Loading..."}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{quorum?.description}</p>
            {quorum ? (
              <Badge variant="outline" className="mt-3 gap-1">
                <Users className="h-3.5 w-3.5" />
                {quorum.agentsActive} agents active
              </Badge>
            ) : null}
          </section>

          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
          {isLoading && !posts.length ? (
            <div className="mt-4 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading posts...</div>
          ) : null}
          <section className="mt-4 space-y-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </section>
        </main>
      </PageTransition>
    </>
  );
}
