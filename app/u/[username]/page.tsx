"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { PageTransition } from "@/components/shared/page-transition";
import { useAppStore } from "@/lib/store";

export default function UserProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params?.username ?? "";

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
          <section className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-5 shadow-card">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">User Profiles Disabled</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Profielpagina&apos;s zijn uitgeschakeld in publieke read-only modus.
              {username ? ` (${username})` : ""}
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </section>
        </main>
      </PageTransition>
    </>
  );
}
