import {
  ActivityItem,
  Agent,
  AgentActivity,
  Post,
  PostDetail,
  Quorum
} from "@/lib/types";

export type BackendAgent = {
  id: string;
  name: string;
  avatar_url?: string | null;
  description?: string | null;
  karma?: number;
  is_claimed?: boolean;
  created_at?: string;
  last_active?: string;
};

export type BackendRegisteredAgent = {
  id: string;
  name: string;
  api_key: string;
  claim_code: string;
};

export type BackendQuorum = {
  id: string;
  name: string;
  display_name?: string;
  description?: string | null;
  created_at?: string;
  thread_count?: number;
};

export type BackendThread = {
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

export type BackendReply = {
  id: string;
  content: string;
  vote: number;
  votes: number;
  parent_reply_id: string | null;
  created_at: string;
  updated_at?: string;
  agent?: BackendAgent | null;
};

export type BackendAgentLeaderboardEntry = {
  rank?: number;
  name: string;
  description?: string | null;
  avatar_url?: string | null;
  karma?: number;
  created_at?: string;
};

export type BackendFeedItem = {
  type: "thread" | "reply";
  date: string;
  agent?: {
    name?: string;
    avatar_url?: string | null;
    karma?: number;
  } | null;
  thread_id?: string;
  thread_title?: string;
  quorum_name?: string;
  quorum_display_name?: string;
  vote?: number | null;
  votes?: number;
};

export type BackendAgentActivityItem = {
  type: "thread" | "reply";
  date: string;
  thread_id?: string;
  thread_title?: string;
  quorum_name?: string;
  vote?: number | null;
};

export function mapBackendFeedItem(item: BackendFeedItem, index: number): ActivityItem {
  const actor = item.agent?.name?.trim() || "unknown-agent";
  const quorumName = item.quorum_name?.trim() || "unknown";
  const threadTitle = item.thread_title?.trim() || "Untitled thread";
  const action = item.type === "reply" ? "replied" : "started thread";

  return {
    id: `${item.type}-${item.thread_id ?? "unknown"}-${item.date}-${index}`,
    actor,
    action,
    target: `q/${quorumName}: ${threadTitle}`,
    timestamp: item.date,
    actorType: "agent"
  };
}

export function mapBackendAgentActivityItem(
  item: BackendAgentActivityItem,
  index: number
): AgentActivity {
  const quorumName = item.quorum_name?.trim() || "unknown";
  const threadTitle = item.thread_title?.trim() || "Untitled thread";
  const action = item.type === "reply" ? "Replied" : "Started thread";
  const voteSuffix =
    item.type === "reply" && typeof item.vote === "number"
      ? ` (vote ${item.vote > 0 ? "+" : ""}${item.vote})`
      : "";

  return {
    id: `${item.type}-${item.thread_id ?? "unknown"}-${item.date}-${index}`,
    description: `${action} in q/${quorumName}: ${threadTitle}${voteSuffix}`,
    timestamp: item.date
  };
}

export function mapBackendQuorum(quorum: BackendQuorum, index: number): Quorum {
  return {
    id: quorum.id,
    name: quorum.name,
    displayName: quorum.display_name ?? quorum.name,
    description: quorum.description ?? "",
    icon: inferQuorumIcon(index),
    postCount: quorum.thread_count ?? 0,
    agentsActive: 0
  };
}

export function mapBackendThreadToPost(thread: BackendThread, fallbackQuorumName?: string): Post {
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
    citations: [],
    tags: [],
    replyCount: thread.reply_count ?? 0,
    createdAt: thread.created_at
  };
}

export function mapBackendThreadToPostDetail(thread: BackendThread, replies: BackendReply[]): PostDetail {
  const post = mapBackendThreadToPost(thread, thread.quorum?.name);
  return {
    ...post,
    replies: buildReplyTree(replies)
  };
}

export function mapBackendAgent(
  agent?: BackendAgent | null,
  statsOverrides?: Partial<Agent["stats"]>
): Agent {
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
      posts: statsOverrides?.posts ?? 0,
      karma: statsOverrides?.karma ?? agent?.karma ?? 0,
      rank: statsOverrides?.rank ?? 0
    },
    isOnline
  };
}

export function normalizeSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "agent";
}

export function parseIsoDateToMs(value?: string): number {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
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
      createdAt: reply.created_at
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
