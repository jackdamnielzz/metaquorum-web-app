import { ActivityItem } from "@/lib/types";
import { requestApi } from "@/lib/api/client";
import {
  BackendFeedItem,
  mapBackendFeedItem,
  parseIsoDateToMs
} from "@/lib/api/types";

export async function fetchActivity(): Promise<ActivityItem[]> {
  try {
    const { feed } = await requestApi<{ feed: BackendFeedItem[] }>("/feed?limit=100");
    return [...(feed ?? [])]
      .sort((a, b) => parseIsoDateToMs(b.date) - parseIsoDateToMs(a.date))
      .map((item, index) => mapBackendFeedItem(item, index));
  } catch {
    return [];
  }
}

export function subscribeActivityStream(
  _onMessage: (items: ActivityItem[]) => void,
  _onError?: (error?: unknown) => void
): (() => void) | null {
  // Backend does not expose a feed stream endpoint yet.
  return null;
}
