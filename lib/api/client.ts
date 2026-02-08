const DEFAULT_LOCAL_API_BASE = "http://localhost:3000";
const DEFAULT_PROD_API_BASE = "https://api.metaquorum.com";

export const READ_ONLY_APP = true;

export const API_BASE = resolveApiBase();

let warnedLocalApiInRemoteRuntime = false;

export function isReadOnlyApp(): boolean {
  return READ_ONLY_APP;
}

export function resolveApiBase(): string {
  const configuredBase = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredBase) {
    return normalizeApiBase(configuredBase);
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const appIsLocal = host === "localhost" || host === "127.0.0.1";
    if (appIsLocal) {
      return DEFAULT_LOCAL_API_BASE;
    }
  }

  return DEFAULT_PROD_API_BASE;
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetchWithDefaults(path, init);

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

export async function requestApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetchWithDefaults(path, init);

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  if (response.status === 204) {
    return {} as T;
  }

  const payload = (await response.json()) as {
    success?: boolean;
    error?: string;
    [key: string]: unknown;
  };

  if (payload.success === false) {
    throw new Error(payload.error ?? "Backend request failed");
  }

  if (payload.success === true) {
    const { success: _success, ...data } = payload;
    return data as T;
  }

  return payload as T;
}

export async function requestMaybeApi<T>(path: string, init?: RequestInit): Promise<T | null> {
  const response = await fetchWithDefaults(path, init);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  if (response.status === 204) {
    return null;
  }

  const payload = (await response.json()) as {
    success?: boolean;
    error?: string;
    [key: string]: unknown;
  };

  if (payload.success === false) {
    throw new Error(payload.error ?? "Backend request failed");
  }

  if (payload.success === true) {
    const { success: _success, ...data } = payload;
    return data as T;
  }

  return payload as T;
}

export async function fetchWithDefaults(path: string, init?: RequestInit): Promise<Response> {
  ensureApiBaseIsReachableFromCurrentOrigin();

  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: buildRequestHeaders(init),
    cache: init?.cache ?? "no-store"
  });
}

export function buildBearerHeaders(apiKey: string): Headers {
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${normalizeApiKey(apiKey)}`);
  return headers;
}

export function buildBearerJsonHeaders(apiKey: string): Headers {
  const headers = buildBearerHeaders(apiKey);
  headers.set("Content-Type", "application/json");
  return headers;
}

export function normalizeApiKey(apiKey: string): string {
  const normalized = apiKey.trim();
  if (!normalized) {
    throw new Error("API key is required for this endpoint.");
  }
  return normalized;
}

export async function parseJsonSafely<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string; message?: string };
    return payload.error ?? payload.message ?? `${response.status} ${response.statusText}`;
  } catch {
    return `${response.status} ${response.statusText}`;
  }
}

function normalizeApiBase(value: string): string {
  return value.replace(/\/+$/, "");
}

function ensureApiBaseIsReachableFromCurrentOrigin() {
  if (typeof window === "undefined" || warnedLocalApiInRemoteRuntime) {
    return;
  }

  const appHost = window.location.hostname;
  const appIsLocal = appHost === "localhost" || appHost === "127.0.0.1";
  if (appIsLocal) {
    return;
  }

  let apiHost = "";
  try {
    apiHost = new URL(API_BASE, window.location.origin).hostname;
  } catch {
    return;
  }

  const apiIsLocal = apiHost === "localhost" || apiHost === "127.0.0.1";
  if (!apiIsLocal) {
    return;
  }

  warnedLocalApiInRemoteRuntime = true;
  throw new Error(
    "NEXT_PUBLIC_API_URL points to localhost while the app runs remotely. Set NEXT_PUBLIC_API_URL to your deployed API URL (for example https://api.metaquorum.com)."
  );
}

function buildRequestHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers ?? undefined);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  return headers;
}
