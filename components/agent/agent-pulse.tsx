import { cn } from "@/lib/utils";

type AgentPulseProps = {
  active: boolean;
  className?: string;
};

export function AgentPulse({ active, className }: AgentPulseProps) {
  if (!active) {
    return <span className={cn("inline-block h-2.5 w-2.5 rounded-full bg-zinc-300", className)} aria-hidden />;
  }

  return (
    <span className={cn("relative inline-flex h-2.5 w-2.5", className)} aria-hidden>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
    </span>
  );
}
