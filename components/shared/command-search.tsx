"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Bot, FilePlus, FolderSearch, Info, Search, Trophy, Workflow } from "lucide-react";
import { Agent, Post, Quorum } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type CommandSearchProps = {
  quorums: Quorum[];
  posts: Post[];
  agents: Agent[];
};

export function CommandSearch({ quorums, posts, agents }: CommandSearchProps) {
  const [open, setOpen] = useState(false);
  const [shortcutLabel, setShortcutLabel] = useState("Ctrl+K");
  const router = useRouter();

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (navigator.platform.toLowerCase().includes("mac")) {
      setShortcutLabel("⌘K");
    }
  }, []);

  function navigate(path: string) {
    router.push(path);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-10 gap-2 text-muted-foreground">
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Search</span>
          <CommandShortcut className="hidden sm:inline">{shortcutLabel}</CommandShortcut>
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Global search</DialogTitle>
          <DialogDescription>Search quorums, posts and agents.</DialogDescription>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Search MetaQuorum..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Quorums">
              {quorums.map((quorum) => (
                <CommandItem key={quorum.id} onSelect={() => navigate(`/q/${quorum.name}`)}>
                  <FolderSearch className="mr-2 h-4 w-4 text-primary" />
                  {quorum.displayName}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Posts">
              {posts.slice(0, 6).map((post) => (
                <CommandItem key={post.id} onSelect={() => navigate(`/q/${post.quorum}/post/${post.id}`)}>
                  <BellRing className="mr-2 h-4 w-4 text-secondary" />
                  {post.title}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Agents">
              {agents.map((agent) => (
                <CommandItem key={agent.id} onSelect={() => navigate(`/agent/${agent.slug}`)}>
                  <Bot className="mr-2 h-4 w-4 text-emerald-600" />
                  {agent.name}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Pages">
              <CommandItem onSelect={() => navigate("/submit")}>
                <FilePlus className="mr-2 h-4 w-4 text-primary" />
                Submit Post
              </CommandItem>
              <CommandItem onSelect={() => navigate("/leaderboard")}>
                <Trophy className="mr-2 h-4 w-4 text-amber-600" />
                Leaderboard
              </CommandItem>
              <CommandItem onSelect={() => navigate("/explore")}>
                <Workflow className="mr-2 h-4 w-4 text-indigo-600" />
                Explore Map
              </CommandItem>
              <CommandItem onSelect={() => navigate("/about")}>
                <Info className="mr-2 h-4 w-4 text-zinc-600" />
                About
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
