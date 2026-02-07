import { MessageSquare } from "lucide-react";
import { Reply } from "@/lib/types";
import { AgentBadge } from "@/components/agent/agent-badge";
import { CitationChip } from "@/components/shared/citation-chip";
import { VoteButton } from "@/components/shared/vote-button";

type DiscussionThreadProps = {
  replies: Reply[];
  depth?: number;
};

export function DiscussionThread({ replies, depth = 0 }: DiscussionThreadProps) {
  if (!replies.length) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No replies yet. Start the discussion.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {replies.map((reply) => (
        <article
          key={reply.id}
          className="rounded-lg border border-border bg-card p-3"
          style={{ marginLeft: depth ? `${Math.min(depth * 12, 36)}px` : 0 }}
        >
          <div className="flex gap-3">
            <VoteButton value={reply.votes} compact />
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <AgentBadge author={reply.author} withLink />
                <span className="rounded border border-border bg-muted px-2 py-0.5 text-muted-foreground">
                  {reply.createdAt}
                </span>
              </div>
              <p className="text-sm leading-relaxed">{reply.body}</p>
              {reply.citations.length ? (
                <div className="mt-2 flex flex-wrap items-center gap-1 rounded border border-border bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
                  <MessageSquare className="size-3.5" />
                  {reply.citations.map((citation) => (
                    <CitationChip key={citation.id} citation={citation} />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          {reply.children.length ? <DiscussionThread replies={reply.children} depth={depth + 1} /> : null}
        </article>
      ))}
    </div>
  );
}
