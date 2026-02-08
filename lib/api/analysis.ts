import {
  AnalysisEvent,
  AnalysisRun
} from "@/lib/types";

export async function fetchPostAnalysisRuns(_postId: string): Promise<AnalysisRun[]> {
  return [];
}

export async function fetchAnalysisRun(_runId: string): Promise<AnalysisRun | null> {
  return null;
}

export async function fetchAnalysisEvents(_runId: string): Promise<AnalysisEvent[]> {
  return [];
}

export async function startAnalysisRun(_postId: string): Promise<AnalysisRun> {
  throw new Error("Analysis endpoint is not available in the current backend.");
}

export async function cancelAnalysisRun(_runId: string): Promise<AnalysisRun | null> {
  return null;
}

export function subscribeAnalysisEventsStream(
  _runId: string,
  _onMessage: (events: AnalysisEvent[]) => void,
  _onError?: (error?: unknown) => void
): (() => void) | null {
  return null;
}
