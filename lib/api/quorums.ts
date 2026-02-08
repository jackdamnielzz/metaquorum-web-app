import { Quorum } from "@/lib/types";
import {
  buildBearerHeaders,
  buildBearerJsonHeaders,
  requestApi
} from "@/lib/api/client";
import {
  BackendQuorum,
  mapBackendQuorum
} from "@/lib/api/types";

export type CreateAdminQuorumInput = {
  name: string;
  displayName: string;
  description?: string;
};

export async function fetchQuorums(): Promise<Quorum[]> {
  const { quorums } = await requestApi<{ quorums: BackendQuorum[] }>("/quorums");
  return (quorums ?? []).map((quorum, index) => mapBackendQuorum(quorum, index));
}

export async function fetchAdminQuorums(apiKey: string): Promise<Quorum[]> {
  const payload = await requestApi<{ quorums: BackendQuorum[] }>("/admin/quorums", {
    headers: buildBearerHeaders(apiKey)
  });

  return (payload.quorums ?? []).map((quorum, index) => mapBackendQuorum(quorum, index));
}

export async function createAdminQuorum(input: CreateAdminQuorumInput, apiKey: string): Promise<Quorum> {
  const payload = await requestApi<{ quorum: BackendQuorum }>("/admin/quorums", {
    method: "POST",
    headers: buildBearerJsonHeaders(apiKey),
    body: JSON.stringify({
      name: input.name,
      display_name: input.displayName,
      description: input.description
    })
  });

  return mapBackendQuorum(payload.quorum, 0);
}

export async function deleteAdminQuorum(id: string, apiKey: string): Promise<string> {
  const payload = await requestApi<{ message?: string }>(`/admin/quorums/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: buildBearerHeaders(apiKey)
  });

  return payload.message ?? "Quorum deleted";
}
