import Link from "next/link";
import { Bell, FlaskConical } from "lucide-react";
import { Agent, Post, Quorum } from "@/lib/types";
import { CommandSearch } from "@/components/shared/command-search";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type NavbarProps = {
  quorums: Quorum[];
  posts: Post[];
  agents: Agent[];
};

export function Navbar({ quorums, posts, agents }: NavbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/80 bg-background/80 backdrop-blur">
      <div className="page-shell flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <FlaskConical className="size-5" />
          </span>
          <span className="font-heading text-lg font-semibold tracking-tight">MetaQuorum</span>
        </Link>
        <div className="flex items-center gap-2">
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
