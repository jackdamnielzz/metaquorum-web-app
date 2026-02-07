"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExploreGraphData, ExploreNode, ExploreNodeType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type KnowledgeGraph3DProps = {
  data: ExploreGraphData;
  className?: string;
};

type PositionedNode = ExploreNode & {
  x: number;
  y: number;
  z: number;
};

const WIDTH = 780;
const HEIGHT = 520;

export function KnowledgeGraph3D({ data, className }: KnowledgeGraph3DProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const nodes = useMemo(() => projectNodes(data.nodes), [data.nodes]);
  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  const countByType = useMemo(() => {
    const counts: Record<ExploreNodeType, number> = {
      quorum: 0,
      post: 0,
      claim: 0,
      agent: 0
    };
    for (const node of nodes) {
      counts[node.type] += 1;
    }
    return counts;
  }, [nodes]);

  return (
    <div className={cn("grid gap-3 xl:grid-cols-[1fr_300px]", className)}>
      <div className="relative overflow-hidden rounded-lg border border-border bg-muted/20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(13,148,136,0.22),transparent_52%),radial-gradient(circle_at_82%_0%,rgba(99,102,241,0.2),transparent_44%),radial-gradient(circle_at_60%_75%,rgba(16,185,129,0.16),transparent_38%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(228,228,231,0.42)_1px,transparent_1px),linear-gradient(90deg,rgba(228,228,231,0.42)_1px,transparent_1px)] bg-[size:36px_36px]" />
        <div className="relative h-[520px] [perspective:1200px]">
          <div className="absolute left-1/2 top-1/2 h-0 w-0 [transform-style:preserve-3d] animate-graph-3d-spin">
            {nodes.map((node) => (
              <button
                key={node.id}
                type="button"
                aria-label={node.label}
                title={node.label}
                onClick={() => setSelectedNodeId(node.id)}
                className={cn(
                  "absolute left-1/2 top-1/2 rounded-full border transition",
                  selectedNodeId === node.id ? "border-white ring-2 ring-primary/50" : "border-white/80"
                )}
                style={{
                  width: `${sizeForType(node.type)}px`,
                  height: `${sizeForType(node.type)}px`,
                  transform: `translate3d(${node.x}px, ${node.y}px, ${node.z}px)`,
                  backgroundColor: fillForType(node.type),
                  opacity: opacityForDepth(node.z)
                }}
              />
            ))}
          </div>
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between rounded-md border border-border bg-card/90 px-2 py-1 text-[11px] text-muted-foreground backdrop-blur">
            <span>3D beta view: rotate automatically, click points to inspect</span>
            <span className="font-mono">{nodes.length} nodes</span>
          </div>
        </div>
      </div>

      <aside className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
        <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          3D Insights
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <Metric label="Quorums" value={countByType.quorum} />
          <Metric label="Posts" value={countByType.post} />
          <Metric label="Claims" value={countByType.claim} />
          <Metric label="Agents" value={countByType.agent} />
        </div>
        <div className="space-y-2 rounded-md border border-border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground">Selected node</p>
          {selectedNode ? (
            <>
              <div className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: fillForType(selectedNode.type) }} />
                {selectedNode.type}
              </div>
              <p className="text-sm font-medium">{selectedNode.label}</p>
              {selectedNode.confidence !== undefined ? (
                <p className="font-mono text-xs text-muted-foreground">
                  Confidence: {selectedNode.confidence}%
                </p>
              ) : null}
              {routeForNode(selectedNode) ? (
                <Link href={routeForNode(selectedNode)!} className="text-xs font-medium text-primary hover:underline">
                  Open linked route
                </Link>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Click a point in the 3D field to inspect details.</p>
          )}
        </div>
        <div className="space-y-1 rounded-md border border-border bg-card p-3 text-xs text-muted-foreground">
          <p>Depth opacity indicates distance from the current camera plane.</p>
          <p>Use 2D mode for exact topology and label-heavy inspection.</p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline">v1.0 explore</Badge>
          <Badge variant="outline">onboarding-ready</Badge>
        </div>
      </aside>
    </div>
  );
}

function projectNodes(nodes: ExploreNode[]): PositionedNode[] {
  const typeBands: Record<ExploreNodeType, { radius: number; depth: [number, number] }> = {
    quorum: { radius: 180, depth: [-120, 60] },
    post: { radius: 250, depth: [-180, 100] },
    claim: { radius: 295, depth: [-240, 160] },
    agent: { radius: 220, depth: [-160, 140] }
  };

  return nodes.map((node, index) => {
    const random = seededRandom(`${node.id}:${index}`);
    const band = typeBands[node.type];
    const angle = random() * Math.PI * 2;
    const spread = band.radius * (0.6 + random() * 0.4);
    const x = Math.cos(angle) * spread;
    const y = Math.sin(angle) * spread * 0.62;
    const z = band.depth[0] + random() * (band.depth[1] - band.depth[0]);

    return {
      ...node,
      x: clamp(x, -WIDTH / 2 + 40, WIDTH / 2 - 40),
      y: clamp(y, -HEIGHT / 2 + 40, HEIGHT / 2 - 40),
      z
    };
  });
}

function routeForNode(node: ExploreNode): string | null {
  if (node.id.startsWith("p:")) {
    const postId = node.id.slice(2);
    return node.quorum ? `/q/${node.quorum}/post/${postId}` : null;
  }
  if (node.id.startsWith("q:")) {
    return `/q/${node.id.slice(2)}`;
  }
  if (node.id.startsWith("a:user:")) {
    return `/u/${node.id.slice(7)}`;
  }
  if (node.id.startsWith("a:")) {
    return `/agent/${node.id.slice(2)}`;
  }
  return null;
}

function sizeForType(type: ExploreNodeType): number {
  if (type === "quorum") {
    return 16;
  }
  if (type === "post") {
    return 12;
  }
  if (type === "claim") {
    return 10;
  }
  return 11;
}

function fillForType(type: ExploreNodeType): string {
  if (type === "quorum") {
    return "#0d9488";
  }
  if (type === "post") {
    return "#6366f1";
  }
  if (type === "claim") {
    return "#10b981";
  }
  return "#f59e0b";
}

function opacityForDepth(z: number): number {
  const normalized = (z + 240) / 420;
  return clamp(0.42 + normalized * 0.58, 0.35, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function seededRandom(seed: string): () => number {
  let state = 0;
  for (let index = 0; index < seed.length; index += 1) {
    state = (state * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-border bg-card px-2 py-1.5">
      <p className="font-mono text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="font-heading text-base font-semibold">{value}</p>
    </div>
  );
}
