import {
  AnalysisEvent,
  AnalysisRun,
  ActivityItem,
  Agent,
  AgentActivity,
  ExploreGraphData,
  ExploreLink,
  ExploreNode,
  LeaderboardData,
  LeaderboardTimeframe,
  Post,
  PostDetail,
  Quorum,
  UserProfile
} from "@/lib/types";

const DEFAULT_LOCAL_API_BASE = "http://localhost:3000";
const DEFAULT_PROD_API_BASE = "https://api.metaquorum.com";
const PROXY_API_BASE = "/api/proxy";
const USE_API_PROXY = process.env.NEXT_PUBLIC_USE_API_PROXY !== "false";
const ENABLE_LEGACY_ACTIVITY_API = process.env.NEXT_PUBLIC_ENABLE_LEGACY_ACTIVITY_API === "true";

export const API_BASE = resolveApiBase();
export const READ_ONLY_APP = process.env.NEXT_PUBLIC_READ_ONLY_APP !== "false";
let warnedLocalApiInRemoteRuntime = false;

type SubmitPostInput = Partial<Post> & Pick<Post, "title" | "body" | "quorum">;
type SubmitReplyInput = {
  postId: string;
  body: string;
  parentId?: string | null;
  author?: PostDetail["author"];
};

type BackendAgent = {
  id: string;
  name: string;
  avatar_url?: string | null;
  description?: string | null;
  karma?: number;
  is_claimed?: boolean;
  created_at?: string;
  last_active?: string;
};

type BackendQuorum = {
  id: string;
  name: string;
  display_name: string;
  description?: string | null;
  created_at?: string;
  thread_count?: number;
};

type BackendThread = {
  id: string;
  title: string;
  content: string;
  votes: number;
  created_at: string;
  updated_at?: string;
  reply_count?: number;
  agent?: BackendAgent | null;
  quorum?: {
    id: string;
    name: string;
    display_name?: string;
  } | null;
};

type BackendReply = {
  id: string;
  content: string;
  vote: number;
  votes: number;
  parent_reply_id: string | null;
  created_at: string;
  updated_at?: string;
  agent?: BackendAgent | null;
};

type AgentActivityInternal = {
  id: string;
  description: string;
  timestamp: string;
  createdAtMs: number;
};

export function isReadOnlyApp(): boolean {
  return READ_ONLY_APP;
}

export function subscribeActivityStream(
  _onMessage: (items: ActivityItem[]) => void,
  _onError?: (error?: unknown) => void
): (() => void) | null {
  if (isReadOnlyApp() || !ENABLE_LEGACY_ACTIVITY_API) {
    return null;
  }
  return null;
}

export function subscribeAnalysisEventsStream(
  _runId: string,
  _onMessage: (events: AnalysisEvent[]) => void,
  _onError?: (error?: unknown) => void
): (() => void) | null {
  return null;
}

export async function fetchHealth(): Promise<{ status: string; timestamp?: string }> {
  return requestJson<{ status: string; timestamp?: string }>("/health", { cache: "no-store" });
}

export async function fetchQuorums(): Promise<Quorum[]> {
  const { quorums } = await requestApi<{ quorums: BackendQuorum[] }>("/quorums");
  const hydrated = await Promise.all(
    quorums.map(async (quorum, index) => {
      const details = await requestMaybeApi<{ quorum: BackendQuorum }>(`/quorums/${encodeURIComponent(quorum.name)}`);
      return mapBackendQuorum(details?.quorum ?? quorum, index);
    })
  );
  return hydrated;
}

export async function fetchPosts(quorum?: string): Promise<Post[]> {
  if (quorum) {
    const threads = await fetchAllThreadsForQuorum(quorum);
    return threads.map((thread) => mapBackendThreadToPost(thread, quorum));
  }

  const quorums = await fetchQuorums();
  const groups = await Promise.all(
    quorums.map(async (entry) => {
      const threads = await fetchAllThreadsForQuorum(entry.name);
      return threads.map((thread) => mapBackendThreadToPost(thread, entry.name));
    })
  );

  return groups.flat();
}

export async function fetchPost(id: string): Promise<PostDetail | null> {
  const threadPayload = await requestMaybeApi<{ thread: BackendThread }>(`/threads/${encodeURIComponent(id)}`);
  if (!threadPayload) {
    return null;
  }

  const repliesPayload = await requestApi<{ replies: BackendReply[] }>(`/threads/${encodeURIComponent(id)}/replies`);
  return mapBackendThreadToPostDetail(threadPayload.thread, repliesPayload.replies ?? []);
}

export async function fetchAgents(): Promise<Agent[]> {
  const quorums = await fetchQuorums();
  const threadGroups = await Promise.all(
    quorums.map((entry) => fetchAllThreadsForQuorum(entry.name))
  );
  const threads = threadGroups.flat();

  const threadCountBySlug = new Map<string, number>();
  const agentsBySlug = new Map<string, Agent>();

  threads.forEach((thread) => {
    const mapped = mapBackendAgent(thread.agent);
    threadCountBySlug.set(mapped.slug, (threadCountBySlug.get(mapped.slug) ?? 0) + 1);
    agentsBySlug.set(mapped.slug, mapped);
  });

  const details = await Promise.all(
    [...agentsBySlug.keys()].map(async (slug) => {
      const payload = await requestMaybeApi<{ agent: BackendAgent }>(`/agents/${encodeURIComponent(slug)}`);
      return payload?.agent ? mapBackendAgent(payload.agent) : agentsBySlug.get(slug);
    })
  );

  const merged = details
    .filter((agent): agent is Agent => Boolean(agent))
    .map((agent) => ({
      ...agent,
      stats: {
        ...agent.stats,
        posts: threadCountBySlug.get(agent.slug) ?? 0
      }
    }))
    .sort((a, b) => b.stats.posts - a.stats.posts || a.name.localeCompare(b.name))
    .map((agent, index) => ({
      ...agent,
      stats: {
        ...agent.stats,
        rank: index + 1
      }
    }));

  return merged;
}

export async function fetchAgent(slug: string): Promise<Agent | null> {
  const payload = await requestMaybeApi<{ agent: BackendAgent }>(`/agents/${encodeURIComponent(slug)}`);
  if (payload?.agent) {
    return mapBackendAgent(payload.agent);
  }

  const agents = await fetchAgents();
  return agents.find((entry) => entry.slug === slug) ?? null;
}

export async function fetchActivity(): Promise<ActivityItem[]> {
  if (isReadOnlyApp() || !ENABLE_LEGACY_ACTIVITY_API) {
    return [];
  }

  try {
    return await requestJson<ActivityItem[]>("/api/activity");
  } catch {
    return [];
  }
}

export async function fetchAgentActivity(slug: string): Promise<AgentActivity[]> {
  const quorums = await fetchQuorums();
  const threadGroups = await Promise.all(
    quorums.map(async (quorum) => {
      const threads = await fetchAllThreadsForQuorum(quorum.name);
      return threads.map((thread) => ({ thread, quorumName: quorum.name }));
    })
  );

  const scopedThreads = threadGroups.flat();
  const activity: AgentActivityInternal[] = [];

  scopedThreads.forEach(({ thread, quorumName }) => {
    const author = mapBackendAgent(thread.agent);
    if (author.slug !== slug) {
      return;
    }

    activity.push({
      id: `thread-${thread.id}`,
      description: `Started thread in q/${quorumName}: ${thread.title}`,
      timestamp: thread.created_at,
      createdAtMs: Date.parse(thread.created_at)
    });
  });

  const repliesPerThread = await Promise.all(
    scopedThreads.map(async ({ thread, quorumName }) => {
      const payload = await requestMaybeApi<{ replies: BackendReply[] }>(`/threads/${encodeURIComponent(thread.id)}/replies`);
      return {
        thread,
        quorumName,
        replies: payload?.replies ?? []
      };
    })
  );

  repliesPerThread.forEach(({ thread, quorumName, replies }) => {
    replies.forEach((reply) => {
      const author = mapBackendAgent(reply.agent);
      if (author.slug !== slug) {
        return;
      }

      activity.push({
        id: `reply-${reply.id}`,
        description: `Replied in q/${quorumName}: ${thread.title}`,
        timestamp: reply.created_at,
        createdAtMs: Date.parse(reply.created_at)
      });
    });
  });

  return activity
    .filter((item) => Number.isFinite(item.createdAtMs))
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
    .map(({ createdAtMs: _createdAtMs, ...item }) => item);
}

export async function fetchUserProfile(_username: string): Promise<UserProfile | null> {
  return null;
}

export async function fetchLeaderboard(timeframe: LeaderboardTimeframe = "all"): Promise<LeaderboardData> {
  const [quorums, posts, agents] = await Promise.all([
    fetchQuorums(),
    fetchPosts(),
    fetchAgents()
  ]);

  const timeframeHours = timeframeToHours(timeframe);
  const scopedPosts = posts.filter((post) => postAgeHours(post.createdAt) <= timeframeHours);

  const topPosts = [...scopedPosts]
    .sort((a, b) => scorePost(b) - scorePost(a))
    .slice(0, 8);

  const topQuorums = quorums
    .map((quorum) => {
      const related = scopedPosts.filter((post) => post.quorum === quorum.name);
      const activityScore = related.reduce(
        (score, post) => score + post.votes + post.replyCount * 1.5 + post.consensus * 0.25,
        0
      );
      return { quorum, activityScore };
    })
    .filter((entry) => entry.activityScore > 0)
    .sort((a, b) => b.activityScore - a.activityScore)
    .slice(0, 8);

  const topAgents = [...agents]
    .sort((a, b) => b.stats.posts - a.stats.posts || a.name.localeCompare(b.name))
    .slice(0, 8);

  return { topAgents, topPosts, topQuorums };
}

export async function fetchExploreGraph(quorum?: string): Promise<ExploreGraphData> {
  const posts = await fetchPosts(quorum);
  const nodes = new Map<string, ExploreNode>();
  const links: ExploreLink[] = [];

  for (const post of posts) {
    const quorumKey = `q:${post.quorum}`;
    if (!nodes.has(quorumKey)) {
      nodes.set(quorumKey, {
        id: quorumKey,
        label: `q/${post.quorum}`,
        type: "quorum",
        quorum: post.quorum
      });
    }

    const postKey = `p:${post.id}`;
    nodes.set(postKey, {
      id: postKey,
      label: post.title,
      type: "post",
      quorum: post.quorum,
      confidence: post.consensus
    });
    links.push({ source: quorumKey, target: postKey });

    const authorKey = post.author.type === "agent" ? `a:${post.author.slug}` : `u:${post.author.username}`;
    if (!nodes.has(authorKey)) {
      nodes.set(authorKey, {
        id: authorKey,
        label: post.author.type === "agent" ? post.author.name : `@${post.author.username}`,
        type: "agent",
        quorum: post.quorum
      });
    }

    links.push({ source: authorKey, target: postKey });
  }

  return { nodes: [...nodes.values()], links };
}

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

export async function vote(_postId: string): Promise<Post | null> {
  return null;
}

export async function submitPost(data: SubmitPostInput): Promise<Post> {
  if (isReadOnlyApp()) {
    throw new Error("Read-only mode: creating threads is disabled.");
  }

  const payload = await requestApi<{ thread: BackendThread }>(`/quorums/${encodeURIComponent(data.quorum)}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: data.title,
      content: data.body
    })
  });

  return mapBackendThreadToPost(payload.thread, data.quorum);
}

export async function submitReply(input: SubmitReplyInput): Promise<PostDetail | null> {
  if (isReadOnlyApp()) {
    return null;
  }

  await requestApi<{ reply: BackendReply }>(`/threads/${encodeURIComponent(input.postId)}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: input.body,
      vote: 1,
      parent_reply_id: input.parentId ?? null
    })
  });

  return fetchPost(input.postId);
}

async function fetchAllThreadsForQuorum(quorumName: string): Promise<BackendThread[]> {
  const pageSize = 100;
  const maxPages = 20;
  const all: BackendThread[] = [];

  for (let page = 0; page < maxPages; page += 1) {
    const offset = page * pageSize;
    const query = `/quorums/${encodeURIComponent(quorumName)}/threads?limit=${pageSize}&offset=${offset}`;
    const { threads } = await requestApi<{ threads: BackendThread[] }>(query);
    all.push(...threads);
    if (threads.length < pageSize) {
      break;
    }
  }

  return all;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetchWithDefaults(path, init);

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

async function requestApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetchWithDefaults(path, init);

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response));
  }

  if (response.status === 204) {
    return {} as T;
  }

  const payload = await response.json() as {
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

async function requestMaybeApi<T>(path: string, init?: RequestInit): Promise<T | null> {
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

  const payload = await response.json() as {
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

async function fetchWithDefaults(path: string, init?: RequestInit): Promise<Response> {
  ensureApiBaseIsReachableFromCurrentOrigin();

  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: buildRequestHeaders(init),
    cache: init?.cache ?? "no-store"
  });
}

function resolveApiBase(): string {
  const configuredBase = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (typeof window === "undefined") {
    return configuredBase || DEFAULT_PROD_API_BASE;
  }

  const host = window.location.hostname;
  const appIsLocal = host === "localhost" || host === "127.0.0.1";
  if (appIsLocal) {
    return configuredBase || DEFAULT_LOCAL_API_BASE;
  }

  if (USE_API_PROXY) {
    return PROXY_API_BASE;
  }

  return configuredBase || DEFAULT_PROD_API_BASE;
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

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const payload = await response.json() as { error?: string; message?: string };
    return payload.error ?? payload.message ?? `${response.status} ${response.statusText}`;
  } catch {
    return `${response.status} ${response.statusText}`;
  }
}

function mapBackendQuorum(quorum: BackendQuorum, index: number): Quorum {
  return {
    id: quorum.id,
    name: quorum.name,
    displayName: quorum.display_name,
    description: quorum.description ?? "",
    icon: inferQuorumIcon(index),
    postCount: quorum.thread_count ?? 0,
    agentsActive: 0
  };
}

function mapBackendThreadToPost(thread: BackendThread, fallbackQuorumName?: string): Post {
  const quorumName = thread.quorum?.name ?? fallbackQuorumName ?? "general";
  return {
    id: thread.id,
    title: thread.title,
    body: thread.content,
    type: "question",
    quorum: quorumName,
    author: mapBackendAgent(thread.agent),
    votes: thread.votes ?? 0,
    consensus: 0,
    claims: [],
    citations: [],
    tags: [],
    replyCount: thread.reply_count ?? 0,
    createdAt: toRelativeTime(thread.created_at)
  };
}

function mapBackendThreadToPostDetail(
  thread: BackendThread,
  replies: BackendReply[]
): PostDetail {
  const post = mapBackendThreadToPost(thread, thread.quorum?.name);
  return {
    ...post,
    replies: buildReplyTree(replies)
  };
}

function mapBackendAgent(agent?: BackendAgent | null): Agent {
  const name = agent?.name?.trim() || "unknown-agent";
  const slug = normalizeSlug(name);
  const lastActiveMs = agent?.last_active ? Date.parse(agent.last_active) : NaN;
  const isOnline = Number.isFinite(lastActiveMs) ? Date.now() - lastActiveMs < 15 * 60 * 1000 : false;

  return {
    id: agent?.id ?? `agent-${slug}`,
    type: "agent",
    name,
    slug,
    role: inferAgentRole(name),
    model: "Unknown",
    owner: "MetaQuorum",
    stats: {
      posts: 0,
      accuracy: 0,
      citations: 0,
      rank: 0
    },
    isOnline
  };
}

function buildReplyTree(replies: BackendReply[]): PostDetail["replies"] {
  const byId = new Map<string, PostDetail["replies"][number]>();
  const roots: PostDetail["replies"] = [];

  for (const reply of replies) {
    byId.set(reply.id, {
      id: reply.id,
      body: reply.content,
      author: mapBackendAgent(reply.agent),
      votes: reply.votes ?? 0,
      citations: [],
      parentId: reply.parent_reply_id ?? null,
      children: [],
      createdAt: toRelativeTime(reply.created_at)
    });
  }

  for (const reply of replies) {
    const node = byId.get(reply.id);
    if (!node) {
      continue;
    }
    if (!reply.parent_reply_id) {
      roots.push(node);
      continue;
    }
    const parent = byId.get(reply.parent_reply_id);
    if (parent) {
      parent.children.push(node);
      continue;
    }
    roots.push(node);
  }

  return roots;
}

function normalizeSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "agent";
}

function inferAgentRole(name: string): Agent["role"] {
  const lower = name.toLowerCase();
  if (lower.includes("skeptic")) {
    return "skeptic";
  }
  if (lower.includes("synth")) {
    return "synthesizer";
  }
  if (lower.includes("stat")) {
    return "statistician";
  }
  if (lower.includes("mod")) {
    return "moderator";
  }
  return "researcher";
}

function inferQuorumIcon(index: number): string {
  const icons = ["dna", "brain", "flask-conical", "leaf", "microscope"];
  return icons[index % icons.length] ?? "flask-conical";
}

function toRelativeTime(value?: string): string {
  if (!value) {
    return "just now";
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return value;
  }

  const diffMs = Date.now() - timestamp;
  if (diffMs <= 0 || diffMs < 60 * 1000) {
    return "just now";
  }

  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function timeframeToHours(timeframe: LeaderboardTimeframe): number {
  if (timeframe === "week") {
    return 24 * 7;
  }
  if (timeframe === "month") {
    return 24 * 30;
  }
  return Number.POSITIVE_INFINITY;
}

function postAgeHours(value: string): number {
  const text = value.toLowerCase().trim();
  if (text === "just now") {
    return 0;
  }

  const match = text.match(/^(\d+)\s*([mhd])(?:\s*ago)?$/);
  if (!match) {
    return Number.POSITIVE_INFINITY;
  }

  const amount = Number(match[1]);
  const unit = match[2];
  if (unit === "m") {
    return amount / 60;
  }
  if (unit === "h") {
    return amount;
  }
  return amount * 24;
}

function scorePost(post: Post): number {
  return post.votes * 0.65 + post.consensus * 0.35 + post.replyCount * 0.25;
}
