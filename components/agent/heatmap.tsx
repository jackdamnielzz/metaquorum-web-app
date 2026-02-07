"use client";

import { useMemo, useState } from "react";
import { AgentActivity } from "@/lib/types";

type HeatmapProps = {
  seed: string;
  activity?: AgentActivity[];
  weeks?: number;
};

type HeatmapCell = {
  date: Date;
  dateKey: string;
  value: number;
  col: number;
  row: number;
  isFuture: boolean;
};

type MonthLabel = {
  label: string;
  col: number;
};

type HeatmapSummary = {
  total: number;
  activeDays: number;
  avgPerWeek: number;
  currentStreak: number;
  bestStreak: number;
  peak: number;
};

const DAY_LABELS = ["Mon", "Wed", "Fri"];

export function Heatmap({ seed, activity = [], weeks = 28 }: HeatmapProps) {
  const [hovered, setHovered] = useState<HeatmapCell | null>(null);
  const [selectedWeeks, setSelectedWeeks] = useState(weeks);

  const { cells, monthLabels, summary } = useMemo(
    () => buildHeatmap(seed, activity, selectedWeeks),
    [seed, activity, selectedWeeks]
  );

  const groupedByColumn = useMemo(() => {
    const cols = Array.from({ length: selectedWeeks }, () => [] as HeatmapCell[]);
    for (const cell of cells) {
      cols[cell.col].push(cell);
    }
    return cols;
  }, [cells, selectedWeeks]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-md border border-border bg-muted/20 p-1">
          {[12, 30, 52].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSelectedWeeks(option)}
              className={`rounded px-2 py-1 text-xs transition ${
                selectedWeeks === option
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option}w
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Window: last {selectedWeeks} weeks</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Total activity" value={summary.total} />
        <MetricCard label="Active days" value={summary.activeDays} />
        <MetricCard label="Avg/week" value={summary.avgPerWeek} />
        <MetricCard label="Current streak" value={summary.currentStreak} suffix="d" />
        <MetricCard label="Best streak" value={summary.bestStreak} suffix="d" />
        <MetricCard label="Peak day" value={summary.peak} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-muted/20 p-3">
        <div className="min-w-[760px]">
          <div className="mb-1 grid grid-cols-[40px_1fr] gap-2">
            <div />
            <div className="relative h-4">
              {monthLabels.map((item) => (
                <span
                  key={`${item.label}-${item.col}`}
                  className="absolute text-[10px] font-mono text-muted-foreground"
                  style={{ left: `${item.col * 14}px` }}
                >
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[40px_1fr] gap-2">
            <div className="grid grid-rows-7 items-center text-[10px] font-mono text-muted-foreground">
              <span />
              <span>{DAY_LABELS[0]}</span>
              <span />
              <span>{DAY_LABELS[1]}</span>
              <span />
              <span>{DAY_LABELS[2]}</span>
              <span />
            </div>

            <div className="grid grid-flow-col gap-1">
              {groupedByColumn.map((column, colIndex) => (
                <div key={colIndex} className="grid grid-rows-7 gap-1">
                  {column.map((cell) => (
                    <button
                      key={cell.dateKey}
                      type="button"
                      className={`h-3 w-3 rounded-[3px] transition hover:scale-110 ${cell.isFuture ? "bg-zinc-50" : colorForLevel(cell.value)}`}
                      aria-label={`${formatDate(cell.date)}: ${cell.value} contributions`}
                      onMouseEnter={() => setHovered(cell)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(cell)}
                      onBlur={() => setHovered(null)}
                      disabled={cell.isFuture}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {hovered ? (
            <>
              <span className="font-medium text-foreground">{formatDate(hovered.date)}</span> · {hovered.value} contributions
            </>
          ) : (
            "Hover over a day to inspect activity details."
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span key={level} className={`h-2.5 w-2.5 rounded-[2px] ${colorForLevel(level)}`} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

function buildHeatmap(seed: string, activity: AgentActivity[], weeks: number): {
  cells: HeatmapCell[];
  monthLabels: MonthLabel[];
  summary: HeatmapSummary;
} {
  const now = startOfDay(new Date());
  const lastSunday = addDays(now, -now.getDay());
  const firstSunday = addDays(lastSunday, -(weeks - 1) * 7);

  const activityBoosts = buildActivityBoostMap(activity, now);
  const cells: HeatmapCell[] = [];
  let total = 0;
  let currentStreak = 0;
  let bestStreak = 0;
  let runningStreak = 0;
  let peak = 0;
  let activeDays = 0;

  for (let col = 0; col < weeks; col += 1) {
    const weekStart = addDays(firstSunday, col * 7);
    for (let row = 0; row < 7; row += 1) {
      const date = addDays(weekStart, row);
      const dateKey = toDateKey(date);
      const isFuture = date.getTime() > now.getTime();
      const weekdayWeight = row === 0 || row === 6 ? 0.8 : 1;
      const base = isFuture ? 0 : seededValue(seed, dateKey, weekdayWeight);
      const boost = isFuture ? 0 : activityBoosts.get(dateKey) ?? 0;
      const value = clamp(base + boost, 0, 4);

      cells.push({ date, dateKey, value, col, row, isFuture });

      if (!isFuture) {
        total += value;
        peak = Math.max(peak, value);

        if (value > 0) {
          activeDays += 1;
          runningStreak += 1;
          bestStreak = Math.max(bestStreak, runningStreak);
        } else {
          runningStreak = 0;
        }
      }
    }
  }

  for (let index = cells.length - 1; index >= 0; index -= 1) {
    if (cells[index].isFuture) {
      continue;
    }
    if (cells[index].value <= 0) {
      break;
    }
    currentStreak += 1;
  }

  return {
    cells,
    monthLabels: buildMonthLabels(cells),
    summary: {
      total,
      activeDays,
      avgPerWeek: Number((total / Math.max(1, weeks)).toFixed(1)),
      currentStreak,
      bestStreak,
      peak
    }
  };
}

function buildActivityBoostMap(activity: AgentActivity[], now: Date): Map<string, number> {
  const boost = new Map<string, number>();
  activity.forEach((item, index) => {
    const eventDate = parseRelativeTimestamp(item.timestamp, now);
    if (!eventDate) {
      return;
    }
    const key = toDateKey(eventDate);
    const previous = boost.get(key) ?? 0;
    const amount = Math.max(1, 3 - index);
    boost.set(key, previous + amount);
  });
  return boost;
}

function buildMonthLabels(cells: HeatmapCell[]): MonthLabel[] {
  const labels: MonthLabel[] = [];
  let previousCol = -100;
  cells.forEach((cell) => {
    if (cell.date.getDate() !== 1) {
      return;
    }
    if (cell.col - previousCol < 3) {
      return;
    }
    labels.push({
      label: cell.date.toLocaleDateString("en-US", { month: "short" }),
      col: cell.col
    });
    previousCol = cell.col;
  });
  return labels;
}

function seededValue(seed: string, key: string, weight = 1): number {
  const value = stableHash(`${seed}:${key}`) % 100;
  let score = 0;
  if (value >= 50) {
    score = 1;
  }
  if (value >= 72) {
    score = 2;
  }
  if (value >= 88) {
    score = 3;
  }
  if (value >= 96) {
    score = 4;
  }
  return Math.round(score * weight);
}

function parseRelativeTimestamp(value: string, now: Date): Date | null {
  const text = value.toLowerCase().trim();
  const match = text.match(/(\d+)\s*([mhdw])/);
  if (!match) {
    return null;
  }
  const amount = Number(match[1]);
  const unit = match[2];

  const date = new Date(now);
  if (unit === "m") {
    date.setMinutes(date.getMinutes() - amount);
  } else if (unit === "h") {
    date.setHours(date.getHours() - amount);
  } else if (unit === "d") {
    date.setDate(date.getDate() - amount);
  } else if (unit === "w") {
    date.setDate(date.getDate() - amount * 7);
  }
  return startOfDay(date);
}

function colorForLevel(level: number): string {
  if (level <= 0) {
    return "bg-zinc-100";
  }
  if (level === 1) {
    return "bg-emerald-100";
  }
  if (level === 2) {
    return "bg-emerald-200";
  }
  if (level === 3) {
    return "bg-emerald-400";
  }
  return "bg-emerald-600";
}

function stableHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function MetricCard({ label, value, suffix = "" }: { label: string; value: number | string; suffix?: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-2 py-2">
      <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-heading text-base font-semibold">
        {value}
        {suffix}
      </p>
    </div>
  );
}
