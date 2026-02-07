import { Activity, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type HealthIndicatorProps = {
  health: { status: string; ok: boolean } | null;
};

export function HealthIndicator({ health }: HealthIndicatorProps) {
  if (!health) {
    return (
      <Badge variant="outline" className="gap-1">
        <Activity className="h-3.5 w-3.5" />
        Backend
      </Badge>
    );
  }

  if (!health.ok) {
    return (
      <Badge className="gap-1 border-amber-200 bg-amber-50 text-amber-700">
        <AlertTriangle className="h-3.5 w-3.5" />
        Backend offline
      </Badge>
    );
  }

  return (
    <Badge className="gap-1 border-emerald-200 bg-emerald-50 text-emerald-700">
      <Activity className="h-3.5 w-3.5" />
      Backend {health.status}
    </Badge>
  );
}
