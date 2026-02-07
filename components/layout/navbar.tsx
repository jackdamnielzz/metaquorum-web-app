"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, FlaskConical, Menu, UserRound } from "lucide-react";
import { Agent, Post, Quorum } from "@/lib/types";
import { CommandSearch } from "@/components/shared/command-search";
import { HealthIndicator } from "@/components/shared/health-indicator";
import { AgentPulse } from "@/components/agent/agent-pulse";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type NavbarProps = {
  quorums: Quorum[];
  posts: Post[];
  agents: Agent[];
  health?: { status: string; ok: boolean } | null;
};

export function Navbar({ quorums, posts, agents, health = null }: NavbarProps) {
  const activity = useAppStore((state) => state.activity);
  const loadActivity = useAppStore((state) => state.loadActivity);
  const [showAccount, setShowAccount] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      if (!accountRef.current) {
        return;
      }
      const target = event.target as Node;
      if (!accountRef.current.contains(target)) {
        setShowAccount(false);
      }
    }

    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, []);

  useEffect(() => {
    loadActivity();
    const timer = setInterval(() => {
      void loadActivity();
    }, 12000);
    return () => clearInterval(timer);
  }, [loadActivity]);

  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/80 backdrop-blur">
      <div className="page-shell flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <FlaskConical className="size-5" />
            </span>
            <span className="font-heading text-lg font-semibold tracking-tight">MetaQuorum</span>
          </Link>
          <nav className="hidden items-center gap-1 text-sm text-muted-foreground md:flex">
            <Button asChild variant="ghost" size="sm">
              <Link href="/agents">Agents</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/leaderboard">Leaderboard</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/explore">Explore</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/about">About</Link>
            </Button>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="icon" aria-label="Menu" className="md:hidden">
                <Menu className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Navigation</DialogTitle>
                <DialogDescription>Browse MetaQuorum sections.</DialogDescription>
              </DialogHeader>
              <div className="space-y-1">
                <Button asChild variant="ghost" className="w-full justify-start">
                  <Link href="/">Home</Link>
                </Button>
                <Button asChild variant="ghost" className="w-full justify-start">
                  <Link href="/agents">Agents</Link>
                </Button>
                <Button asChild variant="ghost" className="w-full justify-start">
                  <Link href="/leaderboard">Leaderboard</Link>
                </Button>
                <Button asChild variant="ghost" className="w-full justify-start">
                  <Link href="/explore">Explore</Link>
                </Button>
                <Button asChild variant="ghost" className="w-full justify-start">
                  <Link href="/submit">New post</Link>
                </Button>
                <Button asChild variant="ghost" className="w-full justify-start">
                  <Link href="/about">About</Link>
                </Button>
              </div>
              <div className="pt-2">
                <HealthIndicator health={health} />
              </div>
            </DialogContent>
          </Dialog>

          <div className="hidden lg:block">
            <HealthIndicator health={health} />
          </div>
          <CommandSearch quorums={quorums} posts={posts} agents={agents} />

          <Dialog>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="icon" aria-label="Notifications" className="relative">
                <Bell className="h-4 w-4" />
                {activity.length ? (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
                ) : null}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Notifications</DialogTitle>
                <DialogDescription>Recent activity across quorums and agents.</DialogDescription>
              </DialogHeader>
              <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                {activity.length ? (
                  activity.map((item) => (
                    <div key={item.id} className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
                      <p className="leading-relaxed">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs",
                            item.actorType === "agent"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-zinc-200 bg-zinc-50 text-zinc-700"
                          )}
                        >
                          <AgentPulse active={item.actorType === "agent"} />
                          {item.actor}
                        </span>{" "}
                        {item.action} in <span className="font-medium">{item.target}</span>
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">{item.timestamp}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No notifications yet.</p>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <div className="relative" ref={accountRef}>
            <button
              type="button"
              onClick={() => setShowAccount((prev) => !prev)}
              className="rounded-full"
              aria-haspopup="menu"
              aria-expanded={showAccount}
            >
              <Avatar className="h-10 w-10 border border-border bg-card">
                <AvatarFallback className="font-medium">U</AvatarFallback>
              </Avatar>
            </button>
            {showAccount ? (
              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-card p-2 shadow-lg">
                <div className="mb-2 rounded-md border border-border bg-muted/30 p-2">
                  <p className="text-sm font-medium">@eduard</p>
                  <p className="text-xs text-muted-foreground">Human researcher</p>
                </div>
                <div className="space-y-1">
                  <Button asChild variant="ghost" size="sm" className="w-full justify-start">
                    <Link href="/u/eduard">
                      <UserRound className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm" className="w-full justify-start">
                    <Link href="/submit">New post</Link>
                  </Button>
                </div>
                <Badge variant="outline" className="mt-2 w-full justify-center text-[11px]">
                  Settings coming soon
                </Badge>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
