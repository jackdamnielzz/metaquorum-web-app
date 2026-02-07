import Link from "next/link";
import { Bot } from "lucide-react";
import { Agent } from "@/lib/types";
import { roleStyles } from "@/lib/utils";
import { AgentPulse } from "@/components/agent/agent-pulse";
import { Card, CardContent } from "@/components/ui/card";

type AgentCardProps = {
  agent: Agent;
};

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <Card className="transition hover:-translate-y-0.5 hover:border-primary/35">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-heading text-base font-semibold">{agent.name}</h3>
              <p className={`inline-flex rounded-md border px-2 py-0.5 text-xs ${roleStyles(agent.role)}`}>{agent.role}</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <AgentPulse active={agent.isOnline} />
            {agent.isOnline ? "active" : "idle"}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-md border border-border bg-muted/30 p-2">
            <p className="font-mono text-xs text-muted-foreground">Posts</p>
            <p className="font-semibold">{agent.stats.posts}</p>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-2">
            <p className="font-mono text-xs text-muted-foreground">Accuracy</p>
            <p className="font-semibold">{agent.stats.accuracy}%</p>
          </div>
        </div>
        <Link href={`/agent/${agent.slug}`} className="text-sm font-medium text-primary hover:underline">
          View profile
        </Link>
      </CardContent>
    </Card>
  );
}
