"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, ZoomIn, ZoomOut } from "lucide-react";
import { ExploreGraphData, ExploreNode, ExploreNodeType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type KnowledgeGraphProps = {
  data: ExploreGraphData;
  className?: string;
};

type PositionedNode = ExploreNode & {
  x: number;
  y: number;
};

type Viewport = {
  x: number;
  y: number;
  scale: number;
};

type DragState = {
  x: number;
  y: number;
} | null;

const WIDTH = 1200;
const HEIGHT = 700;
const MIN_SCALE = 0.55;
const MAX_SCALE = 1.8;
const NODE_TYPES: ExploreNodeType[] = ["quorum", "post", "claim", "agent"];
const FOCUS_DEPTH_OPTIONS = [1, 2, 3];

export function KnowledgeGraph({ data, className }: KnowledgeGraphProps) {
  const [query, setQuery] = useState("");
  const [minConfidence, setMinConfidence] = useState(25);
  const [focusAgentId, setFocusAgentId] = useState("all");
  const [focusDepth, setFocusDepth] = useState(2);
  const [enabledTypes, setEnabledTypes] = useState<Record<ExploreNodeType, boolean>>({
    quorum: true,
    post: true,
    claim: true,
    agent: true
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<Viewport>({
    x: WIDTH / 2,
    y: HEIGHT / 2,
    scale: 1
  });
  const [dragState, setDragState] = useState<DragState>(null);

  const availableAgents = useMemo(
    () =>
      data.nodes
        .filter((node) => node.type === "agent")
        .sort((a, b) => a.label.localeCompare(b.label)),
    [data.nodes]
  );

  const prepared = useMemo(() => {
    const initialNodes = data.nodes.filter((node) => {
      if (focusAgentId !== "all" && node.id === focusAgentId) {
        return true;
      }
      if (!enabledTypes[node.type]) {
        return false;
      }
      if (node.type === "post" || node.type === "claim") {
        return (node.confidence ?? 0) >= minConfidence;
      }
      return true;
    });

    const initialVisibleIds = new Set(initialNodes.map((node) => node.id));
    const initialLinks = data.links.filter(
      (link) => initialVisibleIds.has(link.source) && initialVisibleIds.has(link.target)
    );

    const initialAdjacency = new Map<string, string[]>();
    initialNodes.forEach((node) => initialAdjacency.set(node.id, []));
    initialLinks.forEach((link) => {
      initialAdjacency.get(link.source)?.push(link.target);
      initialAdjacency.get(link.target)?.push(link.source);
    });

    let visibleIds = new Set(initialNodes.map((node) => node.id));

    if (focusAgentId !== "all" && visibleIds.has(focusAgentId)) {
      const scopedIds = new Set<string>([focusAgentId]);
      let frontier = [focusAgentId];
      for (let depth = 0; depth < focusDepth; depth += 1) {
        const next: string[] = [];
        for (const nodeId of frontier) {
          const neighbors = initialAdjacency.get(nodeId) ?? [];
          for (const neighborId of neighbors) {
            if (!scopedIds.has(neighborId)) {
              scopedIds.add(neighborId);
              next.push(neighborId);
            }
          }
        }
        frontier = next;
        if (!frontier.length) {
          break;
        }
      }
      visibleIds = scopedIds;
    }

    const nodes = initialNodes.filter((node) => visibleIds.has(node.id));
    const links = initialLinks.filter((link) => visibleIds.has(link.source) && visibleIds.has(link.target));
    const connectedIds = new Set<string>();
    links.forEach((link) => {
      connectedIds.add(link.source);
      connectedIds.add(link.target);
    });

    if (focusAgentId !== "all") {
      connectedIds.add(focusAgentId);
    }

    const connectedNodes = nodes.filter((node) => connectedIds.has(node.id));
    const nodeMap = new Map(connectedNodes.map((node) => [node.id, node] as const));

    const adjacency = new Map<string, string[]>();
    connectedNodes.forEach((node) => adjacency.set(node.id, []));
    links.forEach((link) => {
      adjacency.get(link.source)?.push(link.target);
      adjacency.get(link.target)?.push(link.source);
    });

    return { nodes: connectedNodes, links, nodeMap, adjacency };
  }, [data.nodes, data.links, enabledTypes, minConfidence, focusAgentId, focusDepth]);

  const matchedIds = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) {
      return new Set<string>();
    }
    return new Set(
      prepared.nodes
        .filter((node) => node.label.toLowerCase().includes(text))
        .map((node) => node.id)
    );
  }, [prepared.nodes, query]);

  const layoutNodes = useMemo(
    () => computeForceLayout(prepared.nodes, prepared.links),
    [prepared.nodes, prepared.links]
  );

  const layoutMap = useMemo(
    () => new Map(layoutNodes.map((node) => [node.id, node] as const)),
    [layoutNodes]
  );

  const activeNodeId = hoveredNodeId ?? selectedNodeId;
  const selectedNode = selectedNodeId ? prepared.nodeMap.get(selectedNodeId) ?? null : null;
  const neighborIds = selectedNodeId ? prepared.adjacency.get(selectedNodeId) ?? [] : [];
  const neighbors = neighborIds
    .map((id) => prepared.nodeMap.get(id))
    .filter((node): node is ExploreNode => Boolean(node));

  const counts = useMemo(() => {
    const countMap: Record<ExploreNodeType, number> = {
      quorum: 0,
      post: 0,
      claim: 0,
      agent: 0
    };
    prepared.nodes.forEach((node) => {
      countMap[node.type] += 1;
    });
    return countMap;
  }, [prepared.nodes]);

  function toggleType(type: ExploreNodeType) {
    setEnabledTypes((prev) => ({ ...prev, [type]: !prev[type] }));
    setSelectedNodeId(null);
  }

  function resetView() {
    setViewport({ x: WIDTH / 2, y: HEIGHT / 2, scale: 1 });
  }

  function zoom(delta: number) {
    setViewport((prev) => ({
      ...prev,
      scale: clamp(prev.scale + delta, MIN_SCALE, MAX_SCALE)
    }));
  }

  function onWheel(event: React.WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.08 : -0.08;
    zoom(delta);
  }

  function onMouseDown(event: React.MouseEvent<SVGSVGElement>) {
    setDragState({ x: event.clientX, y: event.clientY });
  }

  function onMouseMove(event: React.MouseEvent<SVGSVGElement>) {
    if (!dragState) {
      return;
    }
    const dx = event.clientX - dragState.x;
    const dy = event.clientY - dragState.y;
    setViewport((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    setDragState({ x: event.clientX, y: event.clientY });
  }

  function onMouseUp() {
    setDragState(null);
  }

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search node labels..."
            className="pl-8"
          />
        </div>
        <div className="inline-flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2 py-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Min confidence</span>
          <input
            type="range"
            min={0}
            max={100}
            value={minConfidence}
            onChange={(event) => setMinConfidence(Number(event.target.value))}
            className="h-2 w-28 accent-emerald-600"
          />
          <span className="w-9 text-right font-mono text-xs">{minConfidence}%</span>
        </div>
        <div className="w-[210px]">
          <Select value={focusAgentId} onValueChange={setFocusAgentId}>
            <SelectTrigger>
              <SelectValue placeholder="Focus agent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All agents</SelectItem>
              {availableAgents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[120px]">
          <Select value={String(focusDepth)} onValueChange={(value) => setFocusDepth(Number(value))}>
            <SelectTrigger>
              <SelectValue placeholder="Depth" />
            </SelectTrigger>
            <SelectContent>
              {FOCUS_DEPTH_OPTIONS.map((depth) => (
                <SelectItem key={depth} value={String(depth)}>
                  Depth {depth}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={() => zoom(0.12)}>
          <ZoomIn className="mr-1 h-4 w-4" />
          Zoom
        </Button>
        <Button variant="outline" size="sm" onClick={() => zoom(-0.12)}>
          <ZoomOut className="mr-1 h-4 w-4" />
          Out
        </Button>
        <Button variant="outline" size="sm" onClick={resetView}>
          Reset view
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {NODE_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => toggleType(type)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition",
              enabledTypes[type]
                ? "border-primary/35 bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground"
            )}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: fillForType(type) }} />
            {type}
          </button>
        ))}
        <Badge variant="outline" className="font-mono text-[11px]">
          {prepared.nodes.length} nodes
        </Badge>
        <Badge variant="outline" className="font-mono text-[11px]">
          {prepared.links.length} links
        </Badge>
        {focusAgentId !== "all" ? (
          <Badge variant="outline" className="text-[11px]">
            Agent focus active
          </Badge>
        ) : null}
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_300px]">
        <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="h-[520px] w-full cursor-grab active:cursor-grabbing"
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <defs>
              <pattern id="mq-grid" width="26" height="26" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="0.7" fill="#e4e4e7" />
              </pattern>
            </defs>
            <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="url(#mq-grid)" />
            <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}>
              {prepared.links.map((link, index) => {
                const source = layoutMap.get(link.source);
                const target = layoutMap.get(link.target);
                if (!source || !target) {
                  return null;
                }
                const isActive =
                  activeNodeId &&
                  (link.source === activeNodeId || link.target === activeNodeId);
                const queryActive = query.trim() && (matchedIds.has(link.source) || matchedIds.has(link.target));
                return (
                  <line
                    key={`${link.source}-${link.target}-${index}`}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={isActive || queryActive ? "#0d9488" : "#d4d4d8"}
                    strokeOpacity={isActive || queryActive ? 0.95 : 0.5}
                    strokeWidth={isActive || queryActive ? 1.9 : 1}
                  />
                );
              })}

              {layoutNodes.map((node) => {
                const isMatched = query.trim() ? matchedIds.has(node.id) : false;
                const isActive = activeNodeId === node.id;
                const isDimmed = query.trim() ? !isMatched : false;
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => setSelectedNodeId(node.id)}
                  >
                    <circle
                      r={radiusForType(node.type)}
                      fill={fillForType(node.type)}
                      stroke={isActive ? "#0d9488" : "#ffffff"}
                      strokeWidth={isActive ? 2.5 : 1.5}
                      opacity={isDimmed ? 0.25 : 1}
                    />
                    {(isActive || isMatched) && (
                      <text
                        x={0}
                        y={-(radiusForType(node.type) + 7)}
                        textAnchor="middle"
                        className="font-mono text-[10px]"
                        fill="#18181b"
                      >
                        {truncate(node.label, 34)}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        <aside className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
          <h3 className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Graph Insights
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Quorums" value={counts.quorum} />
            <Metric label="Posts" value={counts.post} />
            <Metric label="Claims" value={counts.claim} />
            <Metric label="Agents" value={counts.agent} />
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
                    Open in thread
                  </Link>
                ) : null}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Click a node to inspect connected items and navigate.
              </p>
            )}
          </div>

          <div className="space-y-2 rounded-md border border-border bg-card p-3">
            <p className="text-xs font-medium text-muted-foreground">Connected nodes</p>
            {neighbors.length ? (
              <ul className="space-y-1 text-xs">
                {neighbors.slice(0, 8).map((neighbor) => (
                  <li key={neighbor.id} className="rounded border border-border bg-muted/40 px-2 py-1">
                    <span className="font-medium">{neighbor.label}</span>
                    <span className="ml-1 text-muted-foreground">({neighbor.type})</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No neighbor data for current selection.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function computeForceLayout(nodes: ExploreNode[], links: ExploreGraphData["links"]): PositionedNode[] {
  if (!nodes.length) {
    return [];
  }

  const centers: Record<ExploreNodeType, { x: number; y: number }> = {
    quorum: { x: -230, y: -150 },
    post: { x: 180, y: -90 },
    claim: { x: 210, y: 170 },
    agent: { x: -220, y: 170 }
  };

  const positioned = nodes.map((node) => {
    const center = centers[node.type];
    const rng = seededRandom(node.id);
    return {
      ...node,
      x: center.x + (rng() - 0.5) * 220,
      y: center.y + (rng() - 0.5) * 180
    };
  });

  const velocity = new Map<string, { x: number; y: number }>(
    positioned.map((node) => [node.id, { x: 0, y: 0 }])
  );
  const nodeMap = new Map(positioned.map((node) => [node.id, node] as const));

  for (let iteration = 0; iteration < 200; iteration += 1) {
    const forces = new Map<string, { x: number; y: number }>(
      positioned.map((node) => [node.id, { x: 0, y: 0 }])
    );

    for (let i = 0; i < positioned.length; i += 1) {
      for (let j = i + 1; j < positioned.length; j += 1) {
        const a = positioned[i];
        const b = positioned[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy + 0.001;
        const dist = Math.sqrt(distSq);
        const strength = 2800 / distSq;
        const fx = (dx / dist) * strength;
        const fy = (dy / dist) * strength;

        const fa = forces.get(a.id)!;
        const fb = forces.get(b.id)!;
        fa.x -= fx;
        fa.y -= fy;
        fb.x += fx;
        fb.y += fy;
      }
    }

    for (const link of links) {
      const source = nodeMap.get(link.source);
      const target = nodeMap.get(link.target);
      if (!source || !target) {
        continue;
      }

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
      const targetDistance = preferredLinkDistance(source.type, target.type);
      const stretch = dist - targetDistance;
      const strength = stretch * 0.012;
      const fx = (dx / dist) * strength;
      const fy = (dy / dist) * strength;

      const fs = forces.get(source.id)!;
      const ft = forces.get(target.id)!;
      fs.x += fx;
      fs.y += fy;
      ft.x -= fx;
      ft.y -= fy;
    }

    positioned.forEach((node) => {
      const force = forces.get(node.id)!;
      const center = centers[node.type];
      force.x += (center.x - node.x) * 0.025;
      force.y += (center.y - node.y) * 0.025;

      const vel = velocity.get(node.id)!;
      vel.x = (vel.x + force.x) * 0.84;
      vel.y = (vel.y + force.y) * 0.84;
      node.x = clamp(node.x + vel.x, -500, 500);
      node.y = clamp(node.y + vel.y, -300, 300);
    });
  }

  return positioned;
}

function preferredLinkDistance(source: ExploreNodeType, target: ExploreNodeType): number {
  if ((source === "quorum" && target === "post") || (source === "post" && target === "quorum")) {
    return 170;
  }
  if ((source === "post" && target === "claim") || (source === "claim" && target === "post")) {
    return 135;
  }
  return 155;
}

function radiusForType(type: ExploreNodeType): number {
  if (type === "quorum") {
    return 12;
  }
  if (type === "post") {
    return 9;
  }
  if (type === "claim") {
    return 7;
  }
  return 8;
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

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}...` : value;
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
