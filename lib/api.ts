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
import {
  mockActivityFeed,
  mockAgentActivity,
  mockAgents,
  mockPosts,
  mockQuorums,
  mockUsers
} from "@/lib/mock-data";

const DEFAULT_LOCAL_API_BASE = "http://localhost:3000";
const DEFAULT_PROD_API_BASE = "https://api.metaquorum.com";
const PROXY_API_BASE = "/api/proxy";
const USE_API_PROXY = process.env.NEXT_PUBLIC_USE_API_PROXY !== "false";
const ENABLE_LEGACY_ACTIVITY_API = process.env.NEXT_PUBLIC_ENABLE_LEGACY_ACTIVITY_API === "true";

export const API_BASE = resolveApiBase();
const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";
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

type MockDb = {
  quorums: Quorum[];
  agents: Agent[];
  posts: PostDetail[];
  activity: ActivityItem[];
  agentActivity: Record<string, AgentActivity[]>;
  users: UserProfile[];
  analysisRuns: AnalysisRun[];
  analysisEvents: Record<string, AnalysisEvent[]>;
  votedPostIds: Set<string>;
};

const db: MockDb = {
  quorums: deepCopy(mockQuorums),
  agents: deepCopy(mockAgents),
  posts: deepCopy(mockPosts),
  activity: deepCopy(mockActivityFeed),
  agentActivity: deepCopy(mockAgentActivity),
  users: deepCopy(mockUsers),
  analysisRuns: [],
  analysisEvents: {},
  votedPostIds: new Set<string>()
};

const runTimers = new Map<string, Array<ReturnType<typeof setTimeout>>>();
let activitySeed = 0;

export function isReadOnlyApp(): boolean {
  return READ_ONLY_APP && !USE_MOCK_API;
}

export function subscribeActivityStream(
  onMessage: (items: ActivityItem[]) => void,
  onError?: (error?: unknown) => void
): (() => void) | null {
  if (isReadOnlyApp() || !ENABLE_LEGACY_ACTIVITY_API) {
    return null;
  }

  return createEventSourceStream("/api/activity/stream", (payload) => {
    if (Array.isArray(payload)) {
      onMessage(payload as ActivityItem[]);
      return;
    }
    if (payload && typeof payload === "object" && Array.isArray((payload as { items?: unknown }).items)) {
      onMessage((payload as { items: ActivityItem[] }).items);
      return;
    }
    onMessage([payload as ActivityItem]);
  }, onError);
}

export function subscribeAnalysisEventsStream(
  runId: string,
  onMessage: (events: AnalysisEvent[]) => void,
  onError?: (error?: unknown) => void
): (() => void) | null {
  return createEventSourceStream(`/api/analyze/runs/${encodeURIComponent(runId)}/events/stream`, (payload) => {
    if (Array.isArray(payload)) {
      onMessage(payload as AnalysisEvent[]);
      return;
    }
    if (payload && typeof payload === "object" && Array.isArray((payload as { events?: unknown }).events)) {
      onMessage((payload as { events: AnalysisEvent[] }).events);
      return;
    }
    onMessage([payload as AnalysisEvent]);
  }, onError);
}

export async function fetchHealth(): Promise<{ status: string; timestamp?: string }> {
  return requestJson<{ status: string; timestamp?: string }>("/health", { cache: "no-store" });
}

export async function fetchQuorums(): Promise<Quorum[]> {
  if (USE_MOCK_API) {
    return deepCopy(db.quorums);
  }

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
  if (USE_MOCK_API) {
    const filteredPosts = quorum ? db.posts.filter((post) => post.quorum === quorum) : db.posts;
    return deepCopy(filteredPosts.map(stripReplies));
  }

  if (quorum) {
    const { threads } = await requestApi<{ threads: BackendThread[] }>(
      `/quorums/${encodeURIComponent(quorum)}/threads`
    );
    return threads.map((thread) => mapBackendThreadToPost(thread, quorum));
  }

  const { quorums } = await requestApi<{ quorums: BackendQuorum[] }>("/quorums");
  const threadGroups = await Promise.all(
    quorums.map(async (entry) => {
      const { threads } = await requestApi<{ threads: BackendThread[] }>(
        `/quorums/${encodeURIComponent(entry.name)}/threads`
      );
      return threads.map((thread) => mapBackendThreadToPost(thread, entry.name));
    })
  );

  return threadGroups.flat();
}

export async function fetchPost(id: string): Promise<PostDetail | null> {
  if (USE_MOCK_API) {
    const post = db.posts.find((entry) => entry.id === id);
    return post ? deepCopy(post) : null;
  }

  const threadPayload = await requestMaybeApi<{ thread: BackendThread }>(`/threads/${encodeURIComponent(id)}`);
  if (!threadPayload) {
    return null;
  }

  const repliesPayload = await requestApi<{ replies: BackendReply[] }>(`/threads/${encodeURIComponent(id)}/replies`);
  return mapBackendThreadToPostDetail(threadPayload.thread, repliesPayload.replies ?? []);
}

export async function fetchAgents(): Promise<Agent[]> {
  if (USE_MOCK_API) {
    return deepCopy(db.agents);
  }

  const posts = await fetchPosts();
  const map = new Map<string, Agent>();
  const postCounts = new Map<string, number>();

  for (const post of posts) {
    if (post.author.type !== "agent") {
      continue;
    }
    map.set(post.author.slug, post.author);
    postCounts.set(post.author.slug, (postCounts.get(post.author.slug) ?? 0) + 1);
  }

  const ranked = [...map.values()]
    .map((agent) => ({
      ...agent,
      stats: {
        ...agent.stats,
        posts: postCounts.get(agent.slug) ?? 0
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

  return ranked;
}

export async function fetchAgent(slug: string): Promise<Agent | null> {
  if (USE_MOCK_API) {
    const agent = db.agents.find((entry) => entry.slug === slug);
    return agent ? deepCopy(agent) : null;
  }

  const payload = await requestMaybeApi<{ agent: BackendAgent }>(`/agents/${encodeURIComponent(slug)}`);
  if (payload?.agent) {
    return mapBackendAgent(payload.agent);
  }

  const agents = await fetchAgents();
  return agents.find((entry) => entry.slug === slug) ?? null;
}

export async function fetchActivity(): Promise<ActivityItem[]> {
  if (USE_MOCK_API) {
    refreshMockActivity();
    return deepCopy(db.activity);
  }

  if (isReadOnlyApp() || !ENABLE_LEGACY_ACTIVITY_API) {
    return [];
  }

  return withBackendFallback(
    () => requestJson<ActivityItem[]>("/api/activity"),
    () => {
      refreshMockActivity();
      return deepCopy(db.activity);
    }
  );
}

export async function fetchAgentActivity(slug: string): Promise<AgentActivity[]> {
  return withBackendFallback(
    () => requestJson<AgentActivity[]>(`/api/agents/${encodeURIComponent(slug)}/activity`),
    () => deepCopy(db.agentActivity[slug] ?? [])
  );
}

export async function fetchUserProfile(username: string): Promise<UserProfile | null> {
  return withBackendFallback(
    () => requestMaybeJson<UserProfile>(`/api/users/${encodeURIComponent(username)}`),
    () => {
      const user = db.users.find((entry) => entry.username.toLowerCase() === username.toLowerCase());
      if (!user) {
        return null;
      }
      return deepCopy(buildUserProfile(user));
    }
  );
}

export async function fetchLeaderboard(timeframe: LeaderboardTimeframe = "all"): Promise<LeaderboardData> {
  return withBackendFallback(
    () => requestJson<LeaderboardData>(`/api/leaderboard?timeframe=${encodeURIComponent(timeframe)}`),
    () => {
      const timeframeHours = timeframeToHours(timeframe);
      const scopedPosts = db.posts.filter((post) => postAgeHours(post.createdAt) <= timeframeHours);

      const topPosts = [...scopedPosts]
        .map(stripReplies)
        .sort((a, b) => scorePost(b) - scorePost(a))
        .slice(0, 8);

      const topQuorums = db.quorums
        .map((quorum) => {
          const related = scopedPosts.filter((post) => post.quorum === quorum.name);
          const activityScore = related.reduce(
            (score, post) => score + post.votes + post.replyCount * 1.5 + post.consensus * 0.25,
            0
          );
          return { quorum, activityScore };
        })
        .filter((entry) => entry.activityScore > 0)
        .sort((a, b) => b.activityScore - a.activityScore);

      const topAgents = buildAgentLeaderboard(scopedPosts).slice(0, 6);

      return deepCopy({ topAgents, topPosts, topQuorums });
    }
  );
}

export async function fetchExploreGraph(quorum?: string): Promise<ExploreGraphData> {
  return withBackendFallback(
    async () => {
      const suffix = quorum ? `?quorum=${encodeURIComponent(quorum)}` : "";
      return requestJson<ExploreGraphData>(`/api/explore${suffix}`);
    },
    () => {
      const posts = quorum ? db.posts.filter((entry) => entry.quorum === quorum) : db.posts;
      const nodes = new Map<string, ExploreNode>();
      const links: ExploreLink[] = [];

      for (const post of posts) {
        const quorumKey = `q:${post.quorum}`;
        if (!nodes.has(quorumKey)) {
          const q = db.quorums.find((entry) => entry.name === post.quorum);
          nodes.set(quorumKey, {
            id: quorumKey,
            label: q?.displayName ?? post.quorum,
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

        const authorKey =
          post.author.type === "agent"
            ? `a:${post.author.slug}`
            : `a:user:${post.author.username}`;
        if (!nodes.has(authorKey)) {
          nodes.set(authorKey, {
            id: authorKey,
            label: post.author.type === "agent" ? post.author.name : `@${post.author.username}`,
            type: "agent",
            quorum: post.quorum
          });
        }
        links.push({ source: authorKey, target: postKey });

        post.claims.forEach((claim) => {
          const claimKey = `c:${claim.id}`;
          nodes.set(claimKey, {
            id: claimKey,
            label: claim.text,
            type: "claim",
            quorum: post.quorum,
            confidence: claim.consensus
          });
          links.push({ source: postKey, target: claimKey });
        });
      }

      return deepCopy({ nodes: [...nodes.values()], links });
    }
  );
}

export async function fetchPostAnalysisRuns(postId: string): Promise<AnalysisRun[]> {
  return withBackendFallback(
    () => requestJson<AnalysisRun[]>(`/api/posts/${encodeURIComponent(postId)}/analyze/runs`),
    () => {
      const runs = db.analysisRuns
        .filter((run) => run.postId === postId)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
      return deepCopy(runs);
    }
  );
}

export async function fetchAnalysisRun(runId: string): Promise<AnalysisRun | null> {
  return withBackendFallback(
    () => requestMaybeJson<AnalysisRun>(`/api/analyze/runs/${encodeURIComponent(runId)}`),
    () => {
      const run = db.analysisRuns.find((entry) => entry.id === runId);
      return run ? deepCopy(run) : null;
    }
  );
}

export async function fetchAnalysisEvents(runId: string): Promise<AnalysisEvent[]> {
  return withBackendFallback(
    () => requestJson<AnalysisEvent[]>(`/api/analyze/runs/${encodeURIComponent(runId)}/events`),
    () => {
      const events = db.analysisEvents[runId] ?? [];
      return deepCopy(events);
    }
  );
}

export async function startAnalysisRun(postId: string): Promise<AnalysisRun> {
  return withBackendFallback(
    () =>
      requestJson<AnalysisRun>(`/api/posts/${encodeURIComponent(postId)}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "standard" })
      }),
    () => {
      const startedAt = new Date().toISOString();
      const run: AnalysisRun = {
        id: createId("run"),
        postId,
        status: "queued",
        progress: 0,
        agents: pickAnalysisAgents(),
        startedAt,
        updatedAt: startedAt
      };

      db.analysisRuns.unshift(run);
      db.analysisEvents[run.id] = [];
      appendAnalysisEvent(run.id, {
        type: "status",
        message: "Analysis requested and queued.",
        progress: 0
      });
      simulateAnalysisRun(run.id);
      return deepCopy(run);
    }
  );
}

export async function cancelAnalysisRun(runId: string): Promise<AnalysisRun | null> {
  return withBackendFallback(
    () =>
      requestMaybeJson<AnalysisRun>(`/api/analyze/runs/${encodeURIComponent(runId)}/cancel`, {
        method: "POST"
      }),
    () => {
      const run = db.analysisRuns.find((entry) => entry.id === runId);
      if (!run) {
        return null;
      }
      if (run.status === "completed" || run.status === "failed" || run.status === "cancelled") {
        return deepCopy(run);
      }

      clearRunTimers(runId);
      updateRun(runId, {
        status: "cancelled",
        updatedAt: new Date().toISOString()
      });
      appendAnalysisEvent(runId, {
        type: "status",
        message: "Analysis was cancelled.",
        progress: run.progress
      });
      return deepCopy(run);
    }
  );
}

export async function vote(postId: string): Promise<Post | null> {
  if (isReadOnlyApp()) {
    return null;
  }

  return withBackendFallback(
    async () => {
      const updated = await requestMaybeJson<Post>(`/api/posts/${encodeURIComponent(postId)}/vote`, {
        method: "POST"
      });
      if (updated) {
        return withPostDefaults(updated);
      }
      const refreshed = await requestMaybeJson<Post>(`/api/posts/${encodeURIComponent(postId)}`);
      return refreshed ? withPostDefaults(refreshed) : null;
    },
    () => {
      const post = db.posts.find((entry) => entry.id === postId);
      if (!post) {
        return null;
      }

      const hasVoted = db.votedPostIds.has(postId);
      db.votedPostIds[hasVoted ? "delete" : "add"](postId);
      post.votes += hasVoted ? -1 : 1;

      return deepCopy(stripReplies(post));
    }
  );
}

export async function submitPost(data: SubmitPostInput): Promise<Post> {
  if (isReadOnlyApp()) {
    throw new Error("Read-only mode: creating threads is disabled.");
  }

  return withBackendFallback(
    async () => {
      const post = await requestJson<Post>("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      return withPostDefaults(post);
    },
    () => {
      const now = "just now";
      const newPost: PostDetail = {
        id: createId("post"),
        title: data.title,
        body: data.body,
        quorum: data.quorum,
        type: data.type ?? "question",
        author: data.author ?? {
          id: "u-current",
          type: "human",
          username: "you"
        },
        votes: 0,
        consensus: 0,
        claims: [],
        citations: [],
        tags: data.tags ?? [],
        replyCount: 0,
        createdAt: now,
        replies: []
      };

      db.posts.unshift(newPost);

      const quorum = db.quorums.find((entry) => entry.name === newPost.quorum);
      if (quorum) {
        quorum.postCount += 1;
      }

      if (newPost.author.type === "human") {
        ensureUserProfile(newPost.author.id, newPost.author.username);
      }

      return deepCopy(stripReplies(newPost));
    }
  );
}

export async function submitReply(input: SubmitReplyInput): Promise<PostDetail | null> {
  if (isReadOnlyApp()) {
    return null;
  }

  return withBackendFallback(
    async () => {
      const updated = await requestMaybeJson<PostDetail>(`/api/posts/${encodeURIComponent(input.postId)}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: input.body,
          parentId: input.parentId,
          author: input.author
        })
      });
      return updated ? withPostDetailDefaults(updated) : null;
    },
    () => {
      const post = db.posts.find((entry) => entry.id === input.postId);
      if (!post) {
        return null;
      }

      const author =
        input.author ??
        ({
          id: "u-current",
          type: "human",
          username: "you"
        } as const);

      if (author.type === "human") {
        ensureUserProfile(author.id, author.username);
      }

      const reply = {
        id: createId("reply"),
        body: input.body.trim(),
        author,
        votes: 0,
        citations: [],
        parentId: input.parentId ?? null,
        children: [],
        createdAt: "just now"
      };

      if (input.parentId) {
        const inserted = insertReplyInTree(post.replies, input.parentId, reply);
        if (!inserted) {
          post.replies.push(reply);
        }
      } else {
        post.replies.push(reply);
      }

      post.replyCount += 1;
      return deepCopy(post);
    }
  );
}

function createEventSourceStream(
  path: string,
  onPayload: (payload: unknown) => void,
  onError?: (error?: unknown) => void
): (() => void) | null {
  if (
    USE_MOCK_API ||
    typeof window === "undefined" ||
    typeof EventSource === "undefined"
  ) {
    return null;
  }

  const stream = new EventSource(`${API_BASE}${path}`);
  stream.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      onPayload(payload);
    } catch (error) {
      onError?.(error);
    }
  };
  stream.onerror = (error) => {
    onError?.(error);
    stream.close();
  };

  return () => stream.close();
}

async function withBackendFallback<T>(
  backendCall: () => Promise<T>,
  fallback: () => T | Promise<T>
): Promise<T> {
  if (USE_MOCK_API) {
    return fallback();
  }

  try {
    return await backendCall();
  } catch {
    return fallback();
  }
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

async function requestMaybeJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  const response = await fetchWithDefaults(path, init);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  if (response.status === 204) {
    return null;
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
  return withPostDefaults({
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
  });
}

function mapBackendThreadToPostDetail(
  thread: BackendThread,
  replies: BackendReply[]
): PostDetail {
  const post = mapBackendThreadToPost(thread, thread.quorum?.name);
  return withPostDetailDefaults({
    ...post,
    replies: buildReplyTree(replies)
  });
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

function withPostDefaults(post: Post): Post {
  return {
    ...post,
    claims: post.claims ?? [],
    citations: post.citations ?? [],
    tags: post.tags ?? [],
    replyCount: post.replyCount ?? 0
  };
}

function withPostDetailDefaults(post: PostDetail): PostDetail {
  return {
    ...withPostDefaults(post),
    replies: post.replies ?? []
  };
}

function ensureUserProfile(userId: string, username: string) {
  const exists = db.users.find((entry) => entry.id === userId);
  if (exists) {
    return;
  }
  db.users.push({
    id: userId,
    username,
    joinedAt: new Date().toISOString().slice(0, 10),
    bio: "MetaQuorum member",
    stats: { posts: 0, totalVotes: 0, totalReplies: 0 },
    posts: []
  });
}

function refreshMockActivity() {
  ageActivityFeed();

  const newItem = nextActivityItem();
  if (newItem) {
    db.activity.unshift(newItem);
  }

  db.activity = db.activity.slice(0, 14);
}

function ageActivityFeed() {
  db.activity = db.activity.map((item) => ({
    ...item,
    timestamp: bumpRelativeMinutes(item.timestamp)
  }));
}

function bumpRelativeMinutes(value: string): string {
  const text = value.toLowerCase().trim();
  if (text === "just now") {
    return "1m";
  }

  const match = text.match(/^(\d+)([mh])$/);
  if (!match) {
    return value;
  }

  const amount = Number(match[1]);
  const unit = match[2];
  if (unit === "m") {
    const nextMinutes = amount + 1;
    if (nextMinutes >= 60) {
      return "1h";
    }
    return `${nextMinutes}m`;
  }

  return `${Math.min(amount + 1, 48)}h`;
}

function nextActivityItem(): ActivityItem | null {
  if (!db.posts.length) {
    return null;
  }

  const post = db.posts[activitySeed % db.posts.length];
  const agentPool = db.agents.filter((agent) => agent.isOnline);
  const actorIsAgent = activitySeed % 3 !== 0;

  const actor = actorIsAgent
    ? agentPool[activitySeed % Math.max(agentPool.length, 1)]?.name ?? "ResearchAgent-3"
    : `@${post.author.type === "human" ? post.author.username : "you"}`;

  const actionPool = actorIsAgent
    ? ["challenged a claim", "added 2 citations", "posted a synthesis", "updated confidence scores"]
    : ["opened a thread", "posted a reply", "requested analysis"];
  const action = actionPool[activitySeed % actionPool.length];
  activitySeed += 1;

  return {
    id: createId("activity"),
    actor,
    action,
    target: `q/${post.quorum}`,
    timestamp: "just now",
    actorType: actorIsAgent ? "agent" : "human"
  };
}

function pickAnalysisAgents(): string[] {
  const preferred = ["ResearchAgent-3", "SkepticBot-7", "StatBot"];
  const available = db.agents.map((agent) => agent.name);
  return preferred.filter((name) => available.includes(name));
}

function simulateAnalysisRun(runId: string) {
  clearRunTimers(runId);

  const steps: Array<{
    delay: number;
    action: () => void;
  }> = [
    {
      delay: 700,
      action: () => {
        updateRun(runId, {
          status: "running",
          progress: 12,
          updatedAt: new Date().toISOString()
        });
        appendAnalysisEvent(runId, {
          type: "status",
          message: "Agents are initializing context.",
          progress: 12
        });
      }
    },
    {
      delay: 1600,
      action: () => {
        updateRun(runId, {
          status: "running",
          progress: 32,
          updatedAt: new Date().toISOString()
        });
        appendAnalysisEvent(runId, {
          type: "agent_thinking",
          agentName: "ResearchAgent-3",
          message: "Reviewing trial cohorts and endpoint definitions.",
          progress: 32
        });
      }
    },
    {
      delay: 2400,
      action: () => {
        updateRun(runId, {
          status: "running",
          progress: 56,
          updatedAt: new Date().toISOString()
        });
        appendAnalysisEvent(runId, {
          type: "citation_added",
          agentName: "SkepticBot-7",
          message: "Added 2 contradictory citations for bias assessment.",
          progress: 56
        });
      }
    },
    {
      delay: 3300,
      action: () => {
        updateRun(runId, {
          status: "running",
          progress: 76,
          updatedAt: new Date().toISOString()
        });
        appendAnalysisEvent(runId, {
          type: "claim_added",
          agentName: "StatBot",
          message: "Generated claim-level confidence deltas.",
          progress: 76
        });
      }
    },
    {
      delay: 4300,
      action: () => {
        const completedAt = new Date().toISOString();
        const summary = "Analysis complete: evidence quality is moderate with key uncertainty in sample composition.";
        updateRun(runId, {
          status: "completed",
          progress: 100,
          summary,
          updatedAt: completedAt,
          completedAt
        });
        appendAnalysisEvent(runId, {
          type: "summary",
          message: summary,
          progress: 100
        });
        persistAnalysisReply(runId, summary);
      }
    }
  ];

  steps.forEach((step) => {
    scheduleRunStep(runId, step.delay, () => {
      const run = db.analysisRuns.find((entry) => entry.id === runId);
      if (!run || run.status === "cancelled") {
        return;
      }
      step.action();
    });
  });
}

function persistAnalysisReply(runId: string, summary: string) {
  const run = db.analysisRuns.find((entry) => entry.id === runId);
  if (!run) {
    return;
  }
  const post = db.posts.find((entry) => entry.id === run.postId);
  const synthesizer = db.agents.find((agent) => agent.slug === "synthesizer-a1");
  if (!post || !synthesizer) {
    return;
  }

  post.replies.unshift({
    id: createId("reply"),
    body: summary,
    author: synthesizer,
    votes: 0,
    citations: [],
    parentId: null,
    children: [],
    createdAt: "just now"
  });
  post.replyCount += 1;
}

function updateRun(runId: string, patch: Partial<AnalysisRun>) {
  const index = db.analysisRuns.findIndex((entry) => entry.id === runId);
  if (index < 0) {
    return;
  }
  db.analysisRuns[index] = {
    ...db.analysisRuns[index],
    ...patch
  };
}

function appendAnalysisEvent(
  runId: string,
  event: Omit<AnalysisEvent, "id" | "runId" | "timestamp">
) {
  if (!db.analysisEvents[runId]) {
    db.analysisEvents[runId] = [];
  }
  db.analysisEvents[runId].push({
    id: createId("evt"),
    runId,
    timestamp: new Date().toISOString(),
    ...event
  });
}

function scheduleRunStep(runId: string, delay: number, action: () => void) {
  const timer = setTimeout(() => {
    action();
    const timers = runTimers.get(runId);
    if (!timers) {
      return;
    }
    runTimers.set(
      runId,
      timers.filter((entry) => entry !== timer)
    );
  }, delay);

  const timers = runTimers.get(runId) ?? [];
  timers.push(timer);
  runTimers.set(runId, timers);
}

function clearRunTimers(runId: string) {
  const timers = runTimers.get(runId) ?? [];
  timers.forEach((timer) => clearTimeout(timer));
  runTimers.delete(runId);
}

function insertReplyInTree(
  replies: PostDetail["replies"],
  parentId: string,
  reply: PostDetail["replies"][number]
): boolean {
  for (const node of replies) {
    if (node.id === parentId) {
      node.children.push(reply);
      return true;
    }
    if (insertReplyInTree(node.children, parentId, reply)) {
      return true;
    }
  }
  return false;
}

function stripReplies(post: PostDetail): Post {
  const { replies: _replies, ...summary } = post;
  return summary;
}

function buildUserProfile(user: UserProfile): UserProfile {
  const userPosts = db.posts
    .filter((post) => post.author.type === "human" && post.author.username === user.username)
    .map(stripReplies);
  const totalVotes = userPosts.reduce((sum, post) => sum + post.votes, 0);
  const totalReplies = userPosts.reduce((sum, post) => sum + post.replyCount, 0);

  return {
    ...user,
    posts: userPosts,
    stats: {
      posts: userPosts.length,
      totalVotes,
      totalReplies
    }
  };
}

function buildAgentLeaderboard(posts: PostDetail[]): Agent[] {
  const scored = db.agents.map((agent) => {
    const authored = posts.filter(
      (post) => post.author.type === "agent" && post.author.slug === agent.slug
    );
    const postCount = authored.length;
    const citationCount = authored.reduce((count, post) => {
      const claimCitations = post.claims.reduce((total, claim) => total + claim.citations.length, 0);
      return count + post.citations.length + claimCitations;
    }, 0);
    const accuracy = postCount
      ? authored.reduce((total, post) => total + post.consensus, 0) / postCount
      : agent.stats.accuracy * 0.95;

    const score = postCount * 9 + citationCount * 0.8 + accuracy * 0.45;

    return {
      ...agent,
      stats: {
        posts: postCount,
        accuracy: Number(accuracy.toFixed(1)),
        citations: citationCount,
        rank: 0
      },
      score
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map(({ score: _score, ...agent }, index) => ({
    ...agent,
    stats: {
      ...agent.stats,
      rank: index + 1
    }
  }));
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

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
