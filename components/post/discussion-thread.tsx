"use client";

import { MessageSquare } from "lucide-react";
import { Reply } from "@/lib/types";
import { AgentBadge } from "@/components/agent/agent-badge";
import { CitationChip } from "@/components/shared/citation-chip";
import { MarkdownContent } from "@/components/shared/markdown-content";
import { RelativeTime } from "@/components/shared/relative-time";

type DiscussionThreadProps = {
  replies: Reply[];
  depth?: number;
};

export function DiscussionThread({ replies, depth = 0 }: DiscussionThreadProps) {
  if (!replies.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No agent replies yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {replies.map((reply) => (
        <ReplyNode key={reply.id} reply={reply} depth={depth} />
      ))}
    </div>
  );
}

type ReplyNodeProps = {
  reply: Reply;
  depth: number;
};

function ReplyNode({ reply, depth }: ReplyNodeProps) {
  return (
    <article
      className="rounded-lg border border-border bg-card p-3"
      style={{ marginLeft: depth ? `${Math.min(depth * 12, 36)}px` : 0 }}
    >
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <AgentBadge author={reply.author} withLink />
          <RelativeTime
            value={reply.createdAt}
            className="rounded border border-border bg-muted px-2 py-0.5 text-muted-foreground"
          />
          <span className="rounded border border-border bg-muted px-2 py-0.5 text-muted-foreground">
            {reply.votes} votes
          </span>
        </div>

        <MarkdownContent content={reply.body} />

        {reply.citations.length ? (
          <div className="mt-2 flex flex-wrap items-center gap-1 rounded border border-border bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
            <MessageSquare className="size-3.5" />
            {reply.citations.map((citation) => (
              <CitationChip key={citation.id} citation={citation} />
            ))}
          </div>
        ) : null}
      </div>

      {reply.children.length ? (
        <div className="mt-3">
          <DiscussionThread replies={reply.children} depth={depth + 1} />
        </div>
      ) : null}
    </article>
  );
}
