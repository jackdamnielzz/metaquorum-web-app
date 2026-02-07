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

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type SubmitPostInput = Partial<Post> & Pick<Post, "title" | "body" | "quorum">;
type SubmitReplyInput = {
  postId: string;
  body: string;
  parentId?: string | null;
  author?: PostDetail["author"];
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

export async function fetchHealth(): Promise<{ status: string; timestamp?: string }> {
  const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Health check failed with status ${res.status}`);
  }
  return res.json();
}

export async function fetchQuorums(): Promise<Quorum[]> {
  return deepCopy(db.quorums);
}

export async function fetchPosts(quorum?: string): Promise<Post[]> {
  const filteredPosts = quorum ? db.posts.filter((post) => post.quorum === quorum) : db.posts;
  return deepCopy(filteredPosts.map(stripReplies));
}

export async function fetchPost(id: string): Promise<PostDetail | null> {
  const post = db.posts.find((entry) => entry.id === id);
  return post ? deepCopy(post) : null;
}

export async function fetchAgents(): Promise<Agent[]> {
  return deepCopy(db.agents);
}

export async function fetchAgent(slug: string): Promise<Agent | null> {
  const agent = db.agents.find((entry) => entry.slug === slug);
  return agent ? deepCopy(agent) : null;
}

export async function fetchActivity(): Promise<ActivityItem[]> {
  refreshMockActivity();
  return deepCopy(db.activity);
}

export async function fetchAgentActivity(slug: string): Promise<AgentActivity[]> {
  return deepCopy(db.agentActivity[slug] ?? []);
}

export async function fetchUserProfile(username: string): Promise<UserProfile | null> {
  const user = db.users.find((entry) => entry.username.toLowerCase() === username.toLowerCase());
  if (!user) {
    return null;
  }
  return deepCopy(buildUserProfile(user));
}

export async function fetchLeaderboard(_timeframe: LeaderboardTimeframe = "all"): Promise<LeaderboardData> {
  const topAgents = [...db.agents].sort((a, b) => b.stats.accuracy - a.stats.accuracy).slice(0, 6);
  const topPosts = [...db.posts]
    .map(stripReplies)
    .sort((a, b) => scorePost(b) - scorePost(a))
    .slice(0, 8);

  const topQuorums = db.quorums
    .map((quorum) => {
      const related = db.posts.filter((post) => post.quorum === quorum.name);
      const activityScore = related.reduce((score, post) => score + post.votes + post.replyCount * 1.5, 0);
      return { quorum, activityScore };
    })
    .sort((a, b) => b.activityScore - a.activityScore);

  return deepCopy({ topAgents, topPosts, topQuorums });
}

export async function fetchExploreGraph(quorum?: string): Promise<ExploreGraphData> {
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

export async function fetchPostAnalysisRuns(postId: string): Promise<AnalysisRun[]> {
  const runs = db.analysisRuns
    .filter((run) => run.postId === postId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return deepCopy(runs);
}

export async function fetchAnalysisRun(runId: string): Promise<AnalysisRun | null> {
  const run = db.analysisRuns.find((entry) => entry.id === runId);
  return run ? deepCopy(run) : null;
}

export async function fetchAnalysisEvents(runId: string): Promise<AnalysisEvent[]> {
  const events = db.analysisEvents[runId] ?? [];
  return deepCopy(events);
}

export async function startAnalysisRun(postId: string): Promise<AnalysisRun> {
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

export async function cancelAnalysisRun(runId: string): Promise<AnalysisRun | null> {
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

export async function vote(postId: string): Promise<Post | null> {
  const post = db.posts.find((entry) => entry.id === postId);
  if (!post) {
    return null;
  }

  const hasVoted = db.votedPostIds.has(postId);
  db.votedPostIds[hasVoted ? "delete" : "add"](postId);
  post.votes += hasVoted ? -1 : 1;

  return deepCopy(stripReplies(post));
}

export async function submitPost(data: SubmitPostInput): Promise<Post> {
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

export async function submitReply(input: SubmitReplyInput): Promise<PostDetail | null> {
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

function scorePost(post: Post): number {
  return post.votes * 0.65 + post.consensus * 0.35 + post.replyCount * 0.25;
}

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
