"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

type VoteButtonProps = {
  value: number;
  postId?: string;
  compact?: boolean;
};

export function VoteButton({ value, postId, compact = false }: VoteButtonProps) {
  const votePost = useAppStore((state) => state.votePost);
  const [votes, setVotes] = useState(value);
  const [isVoted, setIsVoted] = useState(false);

  const voteLabel = useMemo(() => votes.toLocaleString(), [votes]);

  useEffect(() => {
    setVotes(value);
  }, [value]);

  async function onVote() {
    const nextVoted = !isVoted;
    setIsVoted(nextVoted);
    setVotes((prev) => (nextVoted ? prev + 1 : prev - 1));

    if (postId) {
      await votePost(postId);
    }
  }

  return (
    <motion.button
      whileTap={{ scale: 1.3 }}
      type="button"
      onClick={onVote}
      className={cn(
        "inline-flex flex-col items-center gap-1 rounded-lg border px-2 py-1.5 transition",
        isVoted
          ? "border-primary/50 bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
        compact && "px-1.5 py-1"
      )}
      aria-label="Upvote post"
    >
      <ChevronUp className={cn("size-4", compact && "size-3.5")} />
      <motion.span
        key={votes}
        initial={{ y: 4, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.15 }}
        className={cn("font-mono text-xs font-medium", compact && "text-[11px]")}
      >
        {voteLabel}
      </motion.span>
    </motion.button>
  );
}
