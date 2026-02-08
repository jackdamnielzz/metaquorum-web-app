import { requestJson } from "@/lib/api/client";

export async function fetchHealth(): Promise<{ status: string; timestamp?: string }> {
  return requestJson<{ status: string; timestamp?: string }>("/health", { cache: "no-store" });
}
