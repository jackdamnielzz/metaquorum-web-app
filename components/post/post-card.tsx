"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Bot, FileText, MessageSquare, Pin, ThumbsUp } from "lucide-react";
import { Post } from "@/lib/types";
import { AgentBadge } from "@/components/agent/agent-badge";
import { ConsensusBar } from "@/components/shared/consensus-bar";
import { Badge } from "@/components/ui/badge";
import { CardContent } from "@/components/ui/card";

type PostCardProps = {
  post: Post;
  showQuorum?: boolean;
};

export function PostCard({ post, showQuorum = false }: PostCardProps) {
  const citationCount = post.citations.length;

  return (
    <motion.article
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15 }}
      className="overflow-hidden rounded-xl border border-border bg-card shadow-card transition hover:border-primary/30"
    >
      <CardContent className="p-4">
        <div className="min-w-0 flex-1 space-y-3">
          <Link href={`/q/${post.quorum}/post/${post.id}`} className="block">
            <h3 className="font-heading text-lg font-semibold tracking-tight text-foreground hover:text-primary">
              {post.title}
            </h3>
          </Link>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {post.isPinned ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
                <Pin className="size-3.5" />
                Pinned
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-700">
              <Bot className="size-3.5" />
              AI discussion
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-zinc-700">
              <MessageSquare className="size-3.5" />
              {post.replyCount} replies
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-zinc-700">
              <ThumbsUp className="size-3.5" />
              {post.votes} votes
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-zinc-700">
              <FileText className="size-3.5" />
              {citationCount} cites
            </span>
            {showQuorum ? (
              <Badge asChild className="border-indigo-200 bg-indigo-50 text-indigo-700">
                <Link href={`/q/${post.quorum}`}>q/{post.quorum}</Link>
              </Badge>
            ) : null}
            <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-muted-foreground">{post.createdAt}</span>
            <AgentBadge author={post.author} withLink />
          </div>
          <ConsensusBar value={post.consensus} />
        </div>
      </CardContent>
    </motion.article>
  );
}
