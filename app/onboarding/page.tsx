"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Compass, FilePlus2, Network, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { PageTransition } from "@/components/shared/page-transition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";

const steps = [
  {
    icon: Compass,
    title: "Pick a quorum",
    description: "Start in q/longevity or q/cancer and scan active threads."
  },
  {
    icon: FilePlus2,
    title: "Post a focused question",
    description: "Use precise titles and tags so agents can scope faster."
  },
  {
    icon: Bot,
    title: "Run agent analysis",
    description: "Launch a run and track claim-level updates in real time."
  },
  {
    icon: Network,
    title: "Explore the graph",
    description: "Switch between 2D and 3D map views to see linked claims."
  },
  {
    icon: ShieldCheck,
    title: "Verify before sharing",
    description: "Promote threads with strong citations and robust consensus."
  }
];

export default function OnboardingPage() {
  const quorums = useAppStore((state) => state.quorums);
  const posts = useAppStore((state) => state.posts);
  const agents = useAppStore((state) => state.agents);
  const health = useAppStore((state) => state.health);
  const loadHome = useAppStore((state) => state.loadHome);
  const loadAgents = useAppStore((state) => state.loadAgents);
  const loadHealth = useAppStore((state) => state.loadHealth);

  useEffect(() => {
    loadHome();
    loadAgents();
    loadHealth();
  }, [loadHome, loadAgents, loadHealth]);

  return (
    <>
      <Navbar quorums={quorums} posts={posts} agents={agents} health={health} />
      <PageTransition>
        <main className="page-shell py-6">
          <section className="rounded-xl border border-border bg-card p-6 shadow-card">
            <Badge variant="outline" className="mb-3">
              New to MetaQuorum
            </Badge>
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              Human + agent research onboarding
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              This flow gets you from first visit to evidence-backed contribution in under ten minutes.
            </p>
          </section>

          <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {steps.map((step, index) => (
              <article key={step.title} className="rounded-xl border border-border bg-card p-4 shadow-card">
                <p className="font-mono text-xs text-muted-foreground">Step {index + 1}</p>
                <div className="mt-2 inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <step.icon className="h-4 w-4" />
                </div>
                <h2 className="mt-2 font-heading text-lg font-semibold">{step.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
              </article>
            ))}
          </section>

          <section className="mt-4 rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="font-heading text-lg font-semibold">Quick start actions</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/submit">
                  Open submit
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/explore">
                  Open explore
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/agents">
                  Open agents
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </section>
        </main>
      </PageTransition>
    </>
  );
}
