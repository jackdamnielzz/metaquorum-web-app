import {
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

type MockDb = {
  quorums: Quorum[];
  agents: Agent[];
  posts: PostDetail[];
  activity: ActivityItem[];
  agentActivity: Record<string, AgentActivity[]>;
  users: UserProfile[];
  votedPostIds: Set<string>;
};

const db: MockDb = {
  quorums: deepCopy(mockQuorums),
  agents: deepCopy(mockAgents),
  posts: deepCopy(mockPosts),
  activity: deepCopy(mockActivityFeed),
  agentActivity: deepCopy(mockAgentActivity),
  users: deepCopy(mockUsers),
  votedPostIds: new Set<string>()
};

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
