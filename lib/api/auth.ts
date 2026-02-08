import { Agent } from "@/lib/types";
import {
  fetchWithDefaults,
  parseJsonSafely
} from "@/lib/api/client";
import {
  BackendAgent,
  mapBackendAgent
} from "@/lib/api/types";

export type VerifyApiKeyResult = {
  valid: boolean;
  agent: Agent | null;
  error?: string;
};

export async function verifyApiKey(apiKey: string): Promise<VerifyApiKeyResult> {
  const response = await fetchWithDefaults("/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey })
  });

  const payload = await parseJsonSafely<{ valid?: boolean; error?: string; agent?: BackendAgent }>(response);
  if (!response.ok) {
    return {
      valid: false,
      agent: null,
      error: payload?.error ?? `${response.status} ${response.statusText}`
    };
  }

  return {
    valid: payload?.valid === true,
    agent: payload?.agent ? mapBackendAgent(payload.agent) : null,
    error: payload?.error
  };
}
