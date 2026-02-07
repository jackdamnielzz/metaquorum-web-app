"use client";

import { create } from "zustand";
import {
  cancelAnalysisRun,
  fetchAnalysisEvents,
  fetchAnalysisRun,
  fetchExploreGraph,
  fetchActivity,
  fetchAgent,
  fetchAgentActivity,
  fetchAgents,
  fetchHealth,
  fetchLeaderboard,
  fetchPostAnalysisRuns,
  fetchPost,
  fetchPosts,
  fetchQuorums,
  fetchUserProfile,
  startAnalysisRun,
  submitPost,
  submitReply,
  vote
} from "@/lib/api";
import {
  AnalysisEvent,
  AnalysisRun,
  ActivityItem,
  Agent,
  AgentActivity,
  ExploreGraphData,
  LeaderboardData,
  LeaderboardTimeframe,
  Post,
  PostDetail,
  PostType,
  Quorum,
  UserProfile
} from "@/lib/types";

export type SortMode = "hot" | "new" | "consensus";

type CreatePostInput = {
  title: string;
  body: string;
  quorum: string;
  type: PostType;
  tags: string[];
};

type AppStore = {
  quorums: Quorum[];
  posts: Post[];
  activity: ActivityItem[];
  agents: Agent[];
  selectedQuorum: string | null;
  sortMode: SortMode;
  currentPost: PostDetail | null;
  currentAgent: Agent | null;
  currentAgentActivity: AgentActivity[];
  currentUser: UserProfile | null;
  leaderboard: LeaderboardData | null;
  exploreGraph: ExploreGraphData | null;
  analysisRuns: AnalysisRun[];
  currentAnalysisRunId: string | null;
  analysisEvents: AnalysisEvent[];
  analysisLoading: boolean;
  replySubmitting: boolean;
  health: { status: string; ok: boolean } | null;
  isLoading: boolean;
  error: string | null;
  loadHome: () => Promise<void>;
  loadQuorum: (quorum: string) => Promise<void>;
  loadActivity: () => Promise<void>;
  loadPost: (id: string) => Promise<void>;
  loadAgents: () => Promise<void>;
  loadAgentProfile: (slug: string) => Promise<void>;
  loadUserProfile: (username: string) => Promise<void>;
  loadLeaderboard: (timeframe?: LeaderboardTimeframe) => Promise<void>;
  loadExploreGraph: (quorum?: string) => Promise<void>;
  loadAnalysisForPost: (postId: string) => Promise<void>;
  startAnalysisForPost: (postId: string) => Promise<AnalysisRun | null>;
  selectAnalysisRun: (runId: string | null) => Promise<void>;
  refreshCurrentAnalysis: () => Promise<void>;
  cancelCurrentAnalysis: () => Promise<void>;
  loadHealth: () => Promise<void>;
  setSortMode: (sortMode: SortMode) => void;
  votePost: (postId: string) => Promise<void>;
  createPost: (input: CreatePostInput) => Promise<Post | null>;
  submitReplyToCurrentPost: (body: string, parentId?: string | null) => Promise<boolean>;
};

export const useAppStore = create<AppStore>((set, get) => ({
  quorums: [],
  posts: [],
  activity: [],
  agents: [],
  selectedQuorum: null,
  sortMode: "hot",
  currentPost: null,
  currentAgent: null,
  currentAgentActivity: [],
  currentUser: null,
  leaderboard: null,
  exploreGraph: null,
  analysisRuns: [],
  currentAnalysisRunId: null,
  analysisEvents: [],
  analysisLoading: false,
  replySubmitting: false,
  health: null,
  isLoading: false,
  error: null,

  loadHome: async () => {
    set({ isLoading: true, error: null, selectedQuorum: null });
    try {
      const [quorums, posts, activity] = await Promise.all([
        fetchQuorums(),
        fetchPosts(),
        fetchActivity()
      ]);
      set((state) => ({
        quorums,
        posts: sortPosts(posts, state.sortMode),
        activity,
        isLoading: false
      }));
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load home feed"
      });
    }
  },

  loadQuorum: async (quorum) => {
    set({ isLoading: true, error: null, selectedQuorum: quorum });
    try {
      const [quorums, posts, activity] = await Promise.all([
        fetchQuorums(),
        fetchPosts(quorum),
        fetchActivity()
      ]);
      set((state) => ({
        quorums,
        posts: sortPosts(posts, state.sortMode),
        activity,
        isLoading: false
      }));
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load quorum feed"
      });
    }
  },

  loadActivity: async () => {
    try {
      const activity = await fetchActivity();
      set({ activity });
    } catch {
      // Keep the existing activity feed if refresh fails.
    }
  },

  loadPost: async (id) => {
    set({ isLoading: true, error: null, currentPost: null });
    try {
      const post = await fetchPost(id);
      if (!post) {
        set({ isLoading: false, error: "Post not found", currentPost: null });
        return;
      }
      set({ currentPost: post, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load post"
      });
    }
  },

  loadAgents: async () => {
    set({ isLoading: true, error: null });
    try {
      const agents = await fetchAgents();
      set({ agents, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load agents"
      });
    }
  },

  loadAgentProfile: async (slug) => {
    set({ isLoading: true, error: null, currentAgent: null, currentAgentActivity: [] });
    try {
      const [agent, activity] = await Promise.all([fetchAgent(slug), fetchAgentActivity(slug)]);
      if (!agent) {
        set({ isLoading: false, error: "Agent not found" });
        return;
      }
      set({
        currentAgent: agent,
        currentAgentActivity: activity,
        isLoading: false
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load agent profile"
      });
    }
  },

  loadUserProfile: async (username) => {
    set({ isLoading: true, error: null, currentUser: null });
    try {
      const user = await fetchUserProfile(username);
      if (!user) {
        set({ isLoading: false, error: "User not found" });
        return;
      }
      set({ currentUser: user, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load user profile"
      });
    }
  },

  loadLeaderboard: async (timeframe = "all") => {
    set({ isLoading: true, error: null });
    try {
      const leaderboard = await fetchLeaderboard(timeframe);
      set({ leaderboard, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load leaderboard"
      });
    }
  },

  loadExploreGraph: async (quorum) => {
    set({ isLoading: true, error: null });
    try {
      const exploreGraph = await fetchExploreGraph(quorum);
      set({ exploreGraph, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load explore graph"
      });
    }
  },

  loadAnalysisForPost: async (postId) => {
    set({ analysisLoading: true, error: null, analysisEvents: [] });
    try {
      const runs = await fetchPostAnalysisRuns(postId);
      const currentRunId = runs[0]?.id ?? null;
      const events = currentRunId ? await fetchAnalysisEvents(currentRunId) : [];
      set({
        analysisRuns: runs,
        currentAnalysisRunId: currentRunId,
        analysisEvents: events,
        analysisLoading: false
      });
    } catch (error) {
      set({
        analysisLoading: false,
        error: error instanceof Error ? error.message : "Failed to load analysis runs"
      });
    }
  },

  startAnalysisForPost: async (postId) => {
    set({ analysisLoading: true, error: null });
    try {
      const run = await startAnalysisRun(postId);
      const runs = await fetchPostAnalysisRuns(postId);
      const events = await fetchAnalysisEvents(run.id);
      set({
        analysisRuns: runs,
        currentAnalysisRunId: run.id,
        analysisEvents: events,
        analysisLoading: false
      });
      return run;
    } catch (error) {
      set({
        analysisLoading: false,
        error: error instanceof Error ? error.message : "Failed to start analysis"
      });
      return null;
    }
  },

  selectAnalysisRun: async (runId) => {
    if (!runId) {
      set({ currentAnalysisRunId: null, analysisEvents: [] });
      return;
    }
    set({ analysisLoading: true });
    try {
      const events = await fetchAnalysisEvents(runId);
      set({
        currentAnalysisRunId: runId,
        analysisEvents: events,
        analysisLoading: false
      });
    } catch {
      set({ analysisLoading: false });
    }
  },

  refreshCurrentAnalysis: async () => {
    const runId = get().currentAnalysisRunId;
    if (!runId) {
      return;
    }
    const run = await fetchAnalysisRun(runId);
    if (!run) {
      return;
    }
    const currentPostId = run.postId;
    const currentPost = get().currentPost;
    const [runs, events, refreshedPost] = await Promise.all([
      fetchPostAnalysisRuns(currentPostId),
      fetchAnalysisEvents(runId),
      currentPost && currentPost.id === currentPostId ? fetchPost(currentPostId) : Promise.resolve(null)
    ]);
    set({
      analysisRuns: runs,
      analysisEvents: events,
      currentPost: refreshedPost ?? currentPost
    });
  },

  cancelCurrentAnalysis: async () => {
    const runId = get().currentAnalysisRunId;
    if (!runId) {
      return;
    }
    const run = await cancelAnalysisRun(runId);
    if (!run) {
      return;
    }
    const [runs, events] = await Promise.all([
      fetchPostAnalysisRuns(run.postId),
      fetchAnalysisEvents(runId)
    ]);
    set({
      analysisRuns: runs,
      analysisEvents: events
    });
  },

  loadHealth: async () => {
    try {
      const health = await fetchHealth();
      set({ health: { status: health.status, ok: true } });
    } catch {
      set({ health: { status: "offline", ok: false } });
    }
  },

  setSortMode: (sortMode) => {
    set((state) => ({
      sortMode,
      posts: sortPosts(state.posts, sortMode)
    }));
  },

  votePost: async (postId) => {
    const updatedPost = await vote(postId);
    if (!updatedPost) {
      return;
    }

    set((state) => ({
      posts: sortPosts(
        state.posts.map((post) => (post.id === updatedPost.id ? updatedPost : post)),
        state.sortMode
      ),
      currentPost: state.currentPost && state.currentPost.id === updatedPost.id
        ? { ...state.currentPost, votes: updatedPost.votes }
        : state.currentPost
    }));
  },

  createPost: async (input) => {
    try {
      const createdPost = await submitPost(input);
      const shouldInclude = get().selectedQuorum ? get().selectedQuorum === createdPost.quorum : true;
      set((state) => ({
        posts: shouldInclude
          ? sortPosts([createdPost, ...state.posts], state.sortMode)
          : state.posts
      }));
      return createdPost;
    } catch {
      return null;
    }
  },

  submitReplyToCurrentPost: async (body, parentId = null) => {
    const currentPost = get().currentPost;
    if (!currentPost || !body.trim()) {
      return false;
    }

    set({ replySubmitting: true });
    try {
      const updatedPost = await submitReply({
        postId: currentPost.id,
        body,
        parentId
      });

      if (!updatedPost) {
        set({ replySubmitting: false });
        return false;
      }

      set((state) => ({
        replySubmitting: false,
        currentPost: updatedPost,
        posts: state.posts.map((post) =>
          post.id === updatedPost.id
            ? { ...post, replyCount: updatedPost.replyCount }
            : post
        )
      }));

      return true;
    } catch {
      set({ replySubmitting: false });
      return false;
    }
  }
}));

function sortPosts(posts: Post[], mode: SortMode): Post[] {
  const copy = [...posts];
  if (mode === "consensus") {
    return copy.sort((a, b) => b.consensus - a.consensus);
  }
  if (mode === "new") {
    return copy;
  }
  return copy.sort((a, b) => scorePost(b) - scorePost(a));
}

function scorePost(post: Post): number {
  return post.votes * 0.65 + post.consensus * 0.35 + post.replyCount * 0.25;
}
