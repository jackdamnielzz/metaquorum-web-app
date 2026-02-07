import { AnimatePresence, motion } from "framer-motion";
import { ActivityItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AgentPulse } from "@/components/agent/agent-pulse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ActivityFeedProps = {
  items: ActivityItem[];
};

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Live Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="flex items-start justify-between gap-3 text-sm"
            >
              <p className="leading-relaxed">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-medium",
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
              <span className="shrink-0 font-mono text-xs text-muted-foreground">{item.timestamp}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
