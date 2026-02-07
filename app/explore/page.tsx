"use client";

import { useEffect, useState } from "react";
import { Filter, Move, Orbit, Search } from "lucide-react";
import { KnowledgeGraph } from "@/components/graph/knowledge-graph";
import { Navbar } from "@/components/layout/navbar";
import { PageTransition } from "@/components/shared/page-transition";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/lib/store";

export default function ExplorePage() {
  const [quorum, setQuorum] = useState<string>("all");
  const quorums = useAppStore((state) => state.quorums);
  const posts = useAppStore((state) => state.posts);
  const agents = useAppStore((state) => state.agents);
  const exploreGraph = useAppStore((state) => state.exploreGraph);
  const health = useAppStore((state) => state.health);
  const error = useAppStore((state) => state.error);
  const isLoading = useAppStore((state) => state.isLoading);
  const loadHome = useAppStore((state) => state.loadHome);
  const loadAgents = useAppStore((state) => state.loadAgents);
  const loadExploreGraph = useAppStore((state) => state.loadExploreGraph);
  const loadHealth = useAppStore((state) => state.loadHealth);

  useEffect(() => {
    loadHome();
    loadAgents();
    loadHealth();
  }, [loadHome, loadAgents, loadHealth]);

  useEffect(() => {
    const value = quorum === "all" ? undefined : quorum;
    loadExploreGraph(value);
  }, [quorum, loadExploreGraph]);

  return (
    <>
      <Navbar quorums={quorums} posts={posts} agents={agents} health={health} />
      <PageTransition>
        <main className="page-shell py-6">
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-heading text-2xl font-semibold tracking-tight">Explore map</h1>
                <p className="text-sm text-muted-foreground">
                  Interactive graph of quorums, posts, claims and agent interactions.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <Orbit className="h-3.5 w-3.5" />
                  interactive v2
                </Badge>
                <div className="w-48">
                  <Select value={quorum} onValueChange={setQuorum}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter quorum" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All quorums</SelectItem>
                      {quorums.map((item) => (
                        <SelectItem key={item.id} value={item.name}>
                          {item.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1">
                <Move className="h-3.5 w-3.5" />
                Drag to pan
              </span>
              <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1">
                <Search className="h-3.5 w-3.5" />
                Search and select nodes
              </span>
            </div>
          </section>

          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
          {isLoading && !exploreGraph ? (
            <div className="mt-4 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading map...</div>
          ) : null}
          {exploreGraph ? (
            <section className="mt-4 rounded-xl border border-border bg-card p-4 shadow-card">
              <div className="mb-3 inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                <Filter className="h-3.5 w-3.5" />
                {quorum === "all" ? "Showing all quorums" : `Filtered to q/${quorum}`}
              </div>
              <KnowledgeGraph data={exploreGraph} />
            </section>
          ) : null}
        </main>
      </PageTransition>
    </>
  );
}
