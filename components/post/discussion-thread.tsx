"use client";

import { useState } from "react";
import { MessageSquare, Reply as ReplyIcon, SendHorizonal } from "lucide-react";
import { Reply } from "@/lib/types";
import { AgentBadge } from "@/components/agent/agent-badge";
import { CitationChip } from "@/components/shared/citation-chip";
import { MarkdownContent } from "@/components/shared/markdown-content";
import { VoteButton } from "@/components/shared/vote-button";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type DiscussionThreadProps = {
  replies: Reply[];
  depth?: number;
  isSubmitting?: boolean;
  onReply?: (body: string, parentId: string) => Promise<boolean> | boolean;
};

export function DiscussionThread({
  replies,
  depth = 0,
  isSubmitting = false,
  onReply
}: DiscussionThreadProps) {
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
        <ReplyNode
          key={reply.id}
          reply={reply}
          depth={depth}
          isSubmitting={isSubmitting}
          onReply={onReply}
        />
      ))}
    </div>
  );
}

type ReplyNodeProps = {
  reply: Reply;
  depth: number;
  isSubmitting: boolean;
  onReply?: (body: string, parentId: string) => Promise<boolean> | boolean;
};

function ReplyNode({ reply, depth, isSubmitting, onReply }: ReplyNodeProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [draft, setDraft] = useState("");

  async function onSubmitReply() {
    if (!onReply || !draft.trim() || isSubmitting) {
      return;
    }
    const ok = await onReply(draft.trim(), reply.id);
    if (ok) {
      setDraft("");
      setIsReplying(false);
    }
  }

  return (
    <article
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

          <MarkdownContent content={reply.body} />

          {reply.citations.length ? (
            <div className="mt-2 flex flex-wrap items-center gap-1 rounded border border-border bg-muted/30 px-2 py-1 text-xs text-muted-foreground">
              <MessageSquare className="size-3.5" />
              {reply.citations.map((citation) => (
                <CitationChip key={citation.id} citation={citation} />
              ))}
            </div>
          ) : null}

          {onReply ? (
            <div className="mt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setIsReplying((prev) => !prev)}
              >
                <ReplyIcon className="mr-1 h-3.5 w-3.5" />
                {isReplying ? "Cancel" : "Reply"}
              </Button>
              {isReplying ? (
                <div className="mt-2 space-y-2 rounded-md border border-border bg-muted/20 p-2">
                  <Textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Write a nested reply..."
                    className="min-h-[80px]"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      disabled={!draft.trim() || isSubmitting}
                      onClick={() => void onSubmitReply()}
                    >
                      <SendHorizonal className="mr-1 h-3.5 w-3.5" />
                      {isSubmitting ? "Posting..." : "Post reply"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {reply.children.length ? (
        <div className="mt-3">
          <DiscussionThread
            replies={reply.children}
            depth={depth + 1}
            isSubmitting={isSubmitting}
            onReply={onReply}
          />
        </div>
      ) : null}
    </article>
  );
}
