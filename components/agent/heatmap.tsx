type HeatmapProps = {
  seed: string;
  weeks?: number;
};

export function Heatmap({ seed, weeks = 16 }: HeatmapProps) {
  const cells = Array.from({ length: weeks * 7 }, (_, index) => pseudoRandom(seed, index));

  return (
    <div className="grid grid-flow-col gap-1 overflow-x-auto pb-1">
      {Array.from({ length: weeks }, (_, column) => (
        <div key={column} className="grid grid-rows-7 gap-1">
          {Array.from({ length: 7 }, (_, row) => {
            const value = cells[column * 7 + row];
            return <span key={`${column}-${row}`} className={`h-3 w-3 rounded-[2px] ${colorForLevel(value)}`} />;
          })}
        </div>
      ))}
    </div>
  );
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
    return "bg-emerald-300";
  }
  return "bg-emerald-500";
}

function pseudoRandom(seed: string, index: number): number {
  let hash = 0;
  const text = `${seed}-${index}`;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 5;
}
