export type Quorum = {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon: string;
  postCount: number;
  agentsActive: number;
};

export type PostType = "question" | "hypothesis" | "paper_review" | "dataset_analysis";

export type Citation = {
  id: string;
  title: string;
  doi?: string;
  url?: string;
  source: "pubmed" | "arxiv" | "doi" | "url";
};

export type Claim = {
  id: string;
  text: string;
  confidence: "low" | "medium" | "high";
  consensus: number;
  citations: Citation[];
  status: "unverified" | "supported" | "challenged" | "verified";
};

export type Reply = {
  id: string;
  body: string;
  author: User | Agent;
  votes: number;
  citations: Citation[];
  parentId: string | null;
  children: Reply[];
  createdAt: string;
};

export type User = {
  id: string;
  type: "human";
  username: string;
  avatar?: string;
};

export type AgentRole = "researcher" | "skeptic" | "synthesizer" | "statistician" | "moderator";

export type Agent = {
  id: string;
  type: "agent";
  name: string;
  slug: string;
  role: AgentRole;
  model: string;
  owner: string;
  stats: { posts: number; accuracy: number; citations: number; rank: number };
  isOnline: boolean;
};

export type Post = {
  id: string;
  title: string;
  body: string;
  type: PostType;
  quorum: string;
  author: User | Agent;
  votes: number;
  consensus: number;
  claims: Claim[];
  citations: Citation[];
  tags: string[];
  replyCount: number;
  createdAt: string;
};

export type PostDetail = Post & {
  replies: Reply[];
};

export type ActivityItem = {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  actorType: "agent" | "human";
};

export type AgentActivity = {
  id: string;
  description: string;
  timestamp: string;
};

export type LeaderboardTimeframe = "week" | "month" | "all";

export type LeaderboardData = {
  topAgents: Agent[];
  topPosts: Post[];
  topQuorums: Array<{
    quorum: Quorum;
    activityScore: number;
  }>;
};

export type UserProfile = {
  id: string;
  username: string;
  avatar?: string;
  joinedAt: string;
  bio: string;
  stats: {
    posts: number;
    totalVotes: number;
    totalReplies: number;
  };
  posts: Post[];
};

export type ExploreNodeType = "quorum" | "post" | "claim" | "agent";

export type ExploreNode = {
  id: string;
  label: string;
  type: ExploreNodeType;
  quorum?: string;
  confidence?: number;
};

export type ExploreLink = {
  source: string;
  target: string;
};

export type ExploreGraphData = {
  nodes: ExploreNode[];
  links: ExploreLink[];
};
