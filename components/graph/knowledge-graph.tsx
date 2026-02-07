"use client";

import { useMemo, useState } from "react";
import { ExploreGraphData, ExploreNodeType } from "@/lib/types";
import { cn } from "@/lib/utils";

type KnowledgeGraphProps = {
  data: ExploreGraphData;
  className?: string;
};

type PositionedNode = {
  id: string;
  label: string;
  type: ExploreNodeType;
  x: number;
  y: number;
};

const WIDTH = 900;
const HEIGHT = 420;

export function KnowledgeGraph({ data, className }: KnowledgeGraphProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const positioned = useMemo<PositionedNode[]>(() => {
    const total = Math.max(data.nodes.length, 1);
    return data.nodes.map((node, index) => {
      const angle = (index / total) * Math.PI * 2;
      const radiusByType: Record<ExploreNodeType, number> = {
        quorum: 70,
        post: 130,
        claim: 190,
        agent: 250
      };
      const radius = radiusByType[node.type];
      const centerX = WIDTH / 2;
      const centerY = HEIGHT / 2;
      return {
        id: node.id,
        label: node.label,
        type: node.type,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      };
    });
  }, [data.nodes]);

  const positionedMap = useMemo(
    () =>
      new Map(
        positioned.map((node) => [node.id, node] as const)
      ),
    [positioned]
  );

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card p-3", className)}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-[320px] w-full">
        {data.links.map((link, index) => {
          const source = positionedMap.get(link.source);
          const target = positionedMap.get(link.target);
          if (!source || !target) {
            return null;
          }
          const isHighlighted = hoveredNodeId && (source.id === hoveredNodeId || target.id === hoveredNodeId);
          return (
            <line
              key={`${link.source}-${link.target}-${index}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={isHighlighted ? "#0d9488" : "#d4d4d8"}
              strokeOpacity={isHighlighted ? 0.95 : 0.7}
              strokeWidth={isHighlighted ? 2 : 1}
            />
          );
        })}
        {positioned.map((node) => (
          <g
            key={node.id}
            transform={`translate(${node.x}, ${node.y})`}
            onMouseEnter={() => setHoveredNodeId(node.id)}
            onMouseLeave={() => setHoveredNodeId(null)}
          >
            <circle r={radiusForType(node.type)} fill={fillForType(node.type)} stroke="#ffffff" strokeWidth={2} />
            {hoveredNodeId === node.id ? (
              <text
                x={0}
                y={-14}
                textAnchor="middle"
                className="font-mono text-[10px]"
                fill="#18181b"
              >
                {truncate(node.label)}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <LegendDot label="Quorum" color={fillForType("quorum")} />
        <LegendDot label="Post" color={fillForType("post")} />
        <LegendDot label="Claim" color={fillForType("claim")} />
        <LegendDot label="Agent/User" color={fillForType("agent")} />
      </div>
    </div>
  );
}

function radiusForType(type: ExploreNodeType): number {
  if (type === "quorum") {
    return 10;
  }
  if (type === "post") {
    return 8;
  }
  if (type === "claim") {
    return 6;
  }
  return 7;
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

function truncate(value: string, max = 26): string {
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function LegendDot({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
