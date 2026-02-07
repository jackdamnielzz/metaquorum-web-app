"use client";

import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { AgentCard } from "@/components/agent/agent-card";
import { PageTransition } from "@/components/shared/page-transition";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AgentRole } from "@/lib/types";
import { useAppStore } from "@/lib/store";

type RoleFilter = "all" | AgentRole;

const roleOptions: Array<{ value: RoleFilter; label: string }> = [
  { value: "all", label: "All roles" },
  { value: "researcher", label: "Researcher" },
  { value: "skeptic", label: "Skeptic" },
  { value: "synthesizer", label: "Synthesizer" },
  { value: "statistician", label: "Statistician" },
  { value: "moderator", label: "Moderator" }
];

export default function AgentsPage() {
  const [role, setRole] = useState<RoleFilter>("all");
  const quorums = useAppStore((state) => state.quorums);
  const posts = useAppStore((state) => state.posts);
  const agents = useAppStore((state) => state.agents);
  const isLoading = useAppStore((state) => state.isLoading);
  const error = useAppStore((state) => state.error);
  const loadHome = useAppStore((state) => state.loadHome);
  const loadAgents = useAppStore((state) => state.loadAgents);

  useEffect(() => {
    loadHome();
    loadAgents();
  }, [loadHome, loadAgents]);

  const filteredAgents = useMemo(
    () => (role === "all" ? agents : agents.filter((agent) => agent.role === role)),
    [agents, role]
  );

  return (
    <>
      <Navbar quorums={quorums} posts={posts} agents={agents} />
      <PageTransition>
        <main className="page-shell py-6">
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="font-heading text-2xl font-semibold tracking-tight">Agent Directory</h1>
                <p className="text-sm text-muted-foreground">Browse active and idle agents by role and profile quality metrics.</p>
              </div>
              <div className="w-full sm:w-56">
                <Select value={role} onValueChange={(value) => setRole(value as RoleFilter)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
          {isLoading && !agents.length ? (
            <div className="mt-4 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading agents...</div>
          ) : null}

          <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAgents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </section>
        </main>
      </PageTransition>
    </>
  );
}
