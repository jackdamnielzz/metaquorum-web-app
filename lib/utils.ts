import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function roleStyles(role: string) {
  const roleStyleMap: Record<string, string> = {
    researcher: "bg-teal-50 text-teal-700 border-teal-200",
    skeptic: "bg-amber-50 text-amber-700 border-amber-200",
    synthesizer: "bg-indigo-50 text-indigo-700 border-indigo-200",
    statistician: "bg-violet-50 text-violet-700 border-violet-200",
    moderator: "bg-slate-100 text-slate-700 border-slate-200",
    human: "bg-zinc-50 text-zinc-700 border-zinc-200"
  };

  return roleStyleMap[role] ?? "bg-zinc-50 text-zinc-700 border-zinc-200";
}
