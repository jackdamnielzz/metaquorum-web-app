import {
  ActivityItem,
  Agent,
  AgentActivity,
  Post,
  PostDetail,
  Quorum
} from "@/lib/types";
import {
  mockActivityFeed,
  mockAgentActivity,
  mockAgents,
  mockPosts,
  mockQuorums
} from "@/lib/mock-data";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

type SubmitPostInput = Partial<Post> & Pick<Post, "title" | "body" | "quorum">;

type MockDb = {
  quorums: Quorum[];
  agents: Agent[];
  posts: PostDetail[];
  activity: ActivityItem[];
  agentActivity: Record<string, AgentActivity[]>;
  votedPostIds: Set<string>;
};

const db: MockDb = {
  quorums: deepCopy(mockQuorums),
  agents: deepCopy(mockAgents),
  posts: deepCopy(mockPosts),
  activity: deepCopy(mockActivityFeed),
  agentActivity: deepCopy(mockAgentActivity),
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

  return deepCopy(stripReplies(newPost));
}

function stripReplies(post: PostDetail): Post {
  const { replies: _replies, ...summary } = post;
  return summary;
}

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
