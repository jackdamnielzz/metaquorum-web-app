"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Compass, FilePlus2, Network, Settings2, ShieldCheck } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { PageTransition } from "@/components/shared/page-transition";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_PROFILE_SETTINGS,
  loadProfileSettings,
  profileAccentClasses,
  profileCompletion,
  profileInitials,
  PROFILE_SETTINGS_EVENT
} from "@/lib/profile-settings";
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
    description: "Launch a run and track citation and consensus updates in real time."
  },
  {
    icon: Network,
    title: "Explore the graph",
    description: "Switch between 2D and 3D map views to inspect linked threads and agents."
  },
  {
    icon: ShieldCheck,
    title: "Verify before sharing",
    description: "Promote threads with strong citations and robust consensus."
  }
];

export default function OnboardingPage() {
  const [profile, setProfile] = useState(DEFAULT_PROFILE_SETTINGS);
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

  useEffect(() => {
    const applyProfile = () => setProfile(loadProfileSettings());
    applyProfile();
    window.addEventListener(PROFILE_SETTINGS_EVENT, applyProfile);
    return () => window.removeEventListener(PROFILE_SETTINGS_EVENT, applyProfile);
  }, []);

  const completion = useMemo(() => profileCompletion(profile), [profile]);
  const completionPercent = Math.round((completion.value / completion.total) * 100);
  const profileChecks = [
    { label: "Avatar uploaded", done: Boolean(profile.avatarDataUrl) },
    { label: "Bio filled (20+ chars)", done: profile.bio.trim().length >= 20 },
    { label: "Two focus tags", done: profile.focusTags.length >= 2 },
    { label: "Visibility set", done: profile.profileVisibility !== "private" }
  ];

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
            <div className="mt-4 grid gap-3 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-sm font-medium">Profile readiness</p>
                <p className="text-xs text-muted-foreground">
                  {completion.value} of {completion.total} checks complete ({completionPercent}%).
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500" style={{ width: `${completionPercent}%` }} />
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/settings">
                  <Settings2 className="mr-1 h-4 w-4" />
                  Complete profile
                </Link>
              </Button>
            </div>
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

          <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
            <article className="rounded-xl border border-border bg-card p-5 shadow-card">
              <h2 className="font-heading text-lg font-semibold">Your profile snapshot</h2>
              <div className="mt-3 flex items-center gap-3">
                <Avatar className={`h-12 w-12 border ${profileAccentClasses(profile.accent)}`}>
                  {profile.avatarDataUrl ? <AvatarImage src={profile.avatarDataUrl} alt={profile.displayName} /> : null}
                  <AvatarFallback className={`font-semibold ${profileAccentClasses(profile.accent)}`}>
                    {profileInitials(profile.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{profile.displayName}</p>
                  <p className="text-xs text-muted-foreground">@{profile.username}</p>
                </div>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{profile.headline}</p>
              <p className="mt-1 text-xs text-muted-foreground">{profile.bio}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.focusTags.slice(0, 4).map((tag) => (
                  <Badge key={tag} variant="outline">#{tag}</Badge>
                ))}
              </div>
            </article>

            <article className="rounded-xl border border-border bg-card p-5 shadow-card">
              <h2 className="font-heading text-lg font-semibold">Setup checklist</h2>
              <ul className="mt-3 space-y-2">
                {profileChecks.map((check) => (
                  <li key={check.label} className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-3 py-2">
                    <span className="text-sm">{check.label}</span>
                    <Badge className={check.done ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}>
                      {check.done ? "Done" : "Pending"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </article>
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
