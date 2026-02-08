"use client";

import { motion } from "framer-motion";
import { Bot, Loader2, Play, Square, TimerReset } from "lucide-react";
import { AnalysisEvent, AnalysisRun } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AnalysisPanelProps = {
  postId: string;
  runs: AnalysisRun[];
  currentRunId: string | null;
  events: AnalysisEvent[];
  loading: boolean;
  onStart: (postId: string) => void;
  onSelect: (runId: string) => void;
  onCancel: () => void;
  onRefresh: () => void;
};

export function AnalysisPanel({
  postId,
  runs,
  currentRunId,
  events,
  loading,
  onStart,
  onSelect,
  onCancel,
  onRefresh
}: AnalysisPanelProps) {
  const currentRun = runs.find((run) => run.id === currentRunId) ?? null;
  const runIsActive = currentRun?.status === "queued" || currentRun?.status === "running";

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-semibold">Agent Analysis</h2>
          <p className="text-sm text-muted-foreground">
            Start an AI run to synthesize citations and consensus signals for this thread.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <TimerReset className="mr-1 h-4 w-4" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => onStart(postId)} disabled={loading || runIsActive}>
            <Play className="mr-1 h-4 w-4" />
            Request analysis
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {runs.length ? (
          runs.map((run) => (
            <button
              key={run.id}
              type="button"
              onClick={() => onSelect(run.id)}
              className={`rounded-md border px-2 py-1 text-xs transition ${
                run.id === currentRunId
                  ? "border-primary/45 bg-primary/10 text-primary"
                  : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              {run.id}
            </button>
          ))
        ) : (
          <span className="rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted-foreground">
            No runs yet
          </span>
        )}
      </div>

      {currentRun ? (
        <div className="mt-4 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge className={statusBadgeClass(currentRun.status)}>{currentRun.status}</Badge>
              <span className="font-mono text-xs text-muted-foreground">{Math.round(currentRun.progress)}%</span>
              {runIsActive ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : null}
            </div>
            {runIsActive ? (
              <Button variant="outline" size="sm" onClick={onCancel}>
                <Square className="mr-1 h-3.5 w-3.5" />
                Cancel
              </Button>
            ) : null}
          </div>

          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(2, currentRun.progress)}%` }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Started {formatTimestamp(currentRun.startedAt)} · Updated {formatTimestamp(currentRun.updatedAt)}
          </p>
        </div>
      ) : null}

      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-lg border border-border bg-muted/10 p-3">
        {events.length ? (
          events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16, delay: index * 0.02 }}
              className="rounded-md border border-border bg-card px-2.5 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs leading-relaxed">
                  <span className="mr-1 inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 font-medium text-muted-foreground">
                    <Bot className="h-3 w-3" />
                    {event.agentName ?? event.type}
                  </span>
                  {event.message}
                </p>
                <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                  {formatTimestamp(event.timestamp)}
                </span>
              </div>
            </motion.div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">Analysis events will appear here.</p>
        )}
      </div>
    </section>
  );
}

function statusBadgeClass(status: AnalysisRun["status"]): string {
  if (status === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "running") {
    return "border-teal-200 bg-teal-50 text-teal-700";
  }
  if (status === "queued") {
    return "border-indigo-200 bg-indigo-50 text-indigo-700";
  }
  if (status === "failed") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}
