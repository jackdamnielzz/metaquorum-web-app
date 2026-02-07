import Link from "next/link";
import { Bell, FlaskConical } from "lucide-react";
import { Agent, Post, Quorum } from "@/lib/types";
import { CommandSearch } from "@/components/shared/command-search";
import { HealthIndicator } from "@/components/shared/health-indicator";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type NavbarProps = {
  quorums: Quorum[];
  posts: Post[];
  agents: Agent[];
  health?: { status: string; ok: boolean } | null;
};

export function Navbar({ quorums, posts, agents, health = null }: NavbarProps) {
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
          <div className="hidden lg:block">
            <HealthIndicator health={health} />
          </div>
          <CommandSearch quorums={quorums} posts={posts} agents={agents} />
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </Button>
          <Avatar className="h-10 w-10 border border-border bg-card">
            <AvatarFallback className="font-medium">U</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
