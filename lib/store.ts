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
  isReadOnlyApp,
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

type RefreshOptions = {
  forceRefresh?: boolean;
};

type CreatePostInput = {
  title: string;
  body: string;
  quorum: string;
  type: PostType;
  tags: string[];
  author?: Post["author"];
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
  quorumsLoading: boolean;
  postsLoading: boolean;
  activityLoading: boolean;
  agentsLoading: boolean;
  healthLoading: boolean;
  leaderboardLoading: boolean;
  exploreLoading: boolean;
  currentPostLoading: boolean;
  currentAgentLoading: boolean;
  error: string | null;
  quorumsFetchedAt: number | null;
  postsFetchedAtByScope: Record<string, number>;
  activityFetchedAt: number | null;
  agentsFetchedAt: number | null;
  healthFetchedAt: number | null;
  leaderboardFetchedAtByTimeframe: Record<LeaderboardTimeframe, number | null>;
  exploreFetchedAtByScope: Record<string, number>;
  currentPostFetchedAtById: Record<string, number>;
  currentAgentFetchedAtBySlug: Record<string, number>;
  loadShared: (options?: RefreshOptions) => Promise<void>;
  loadHome: (options?: RefreshOptions) => Promise<void>;
  loadQuorum: (quorum: string, options?: RefreshOptions) => Promise<void>;
  loadQuorums: (options?: RefreshOptions) => Promise<void>;
  loadPosts: (quorum?: string, options?: RefreshOptions) => Promise<void>;
  loadActivity: (options?: RefreshOptions) => Promise<void>;
  loadPost: (id: string, options?: RefreshOptions) => Promise<void>;
  loadAgents: (options?: RefreshOptions) => Promise<void>;
  loadAgentProfile: (slug: string, options?: RefreshOptions) => Promise<void>;
  loadUserProfile: (username: string, options?: RefreshOptions) => Promise<void>;
  loadLeaderboard: (timeframe?: LeaderboardTimeframe, options?: RefreshOptions) => Promise<void>;
  loadExploreGraph: (quorum?: string, options?: RefreshOptions) => Promise<void>;
  loadHealth: (options?: RefreshOptions) => Promise<void>;
  loadAnalysisForPost: (postId: string) => Promise<void>;
  startAnalysisForPost: (postId: string) => Promise<AnalysisRun | null>;
  selectAnalysisRun: (runId: string | null) => Promise<void>;
  refreshCurrentAnalysis: () => Promise<void>;
  cancelCurrentAnalysis: () => Promise<void>;
  setSortMode: (sortMode: SortMode) => void;
  votePost: (postId: string) => Promise<void>;
  createPost: (input: CreatePostInput) => Promise<Post | null>;
  submitReplyToCurrentPost: (body: string, parentId?: string | null) => Promise<boolean>;
};

const RESOURCE_STALE_MS = 60_000;
const inflightRequests = new Map<string, Promise<unknown>>();

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
  quorumsLoading: false,
  postsLoading: false,
  activityLoading: false,
  agentsLoading: false,
  healthLoading: false,
  leaderboardLoading: false,
  exploreLoading: false,
  currentPostLoading: false,
  currentAgentLoading: false,
  error: null,
  quorumsFetchedAt: null,
  postsFetchedAtByScope: {},
  activityFetchedAt: null,
  agentsFetchedAt: null,
  healthFetchedAt: null,
  leaderboardFetchedAtByTimeframe: {
    week: null,
    month: null,
    all: null
  },
  exploreFetchedAtByScope: {},
  currentPostFetchedAtById: {},
  currentAgentFetchedAtBySlug: {},

  loadShared: async (options = {}) => {
    await Promise.all([
      get().loadQuorums(options),
      get().loadAgents(options),
      get().loadHealth(options)
    ]);
  },

  loadHome: async (options = {}) => {
    set({ selectedQuorum: null });
    await Promise.all([
      get().loadPosts(undefined, options),
      get().loadActivity(options)
    ]);
  },

  loadQuorum: async (quorum, options = {}) => {
    set({ selectedQuorum: quorum });
    await Promise.all([
      get().loadPosts(quorum, options),
      get().loadActivity(options)
    ]);
  },

  loadQuorums: async (options = {}) => {
    const forceRefresh = options.forceRefresh === true;
    const state = get();

    if (!forceRefresh && isFresh(state.quorumsFetchedAt)) {
      return;
    }

    await runDeduped("loadQuorums", async () => {
      set({ quorumsLoading: true, error: null });

      try {
        const quorums = await fetchQuorums();
        set({
          quorums,
          quorumsFetchedAt: Date.now(),
          quorumsLoading: false
        });
      } catch (error) {
        set({
          quorumsLoading: false,
          error: resolveErrorMessage(error, "Failed to load quorums")
        });
      }
    });
  },

  loadPosts: async (quorum, options = {}) => {
    const scopeKey = getScopeKey(quorum);
    const forceRefresh = options.forceRefresh === true;
    const state = get();

    set({ selectedQuorum: quorum ?? null });

    if (!forceRefresh && isFresh(state.postsFetchedAtByScope[scopeKey])) {
      return;
    }

    await runDeduped(`loadPosts:${scopeKey}`, async () => {
      set({ postsLoading: true, error: null });

      try {
        const nextState = get();
        const posts = await fetchPosts(quorum, {
          quorums: nextState.quorums.length ? nextState.quorums : undefined
        });

        set((current) => ({
          posts: sortPosts(posts, current.sortMode),
          postsLoading: false,
          postsFetchedAtByScope: {
            ...current.postsFetchedAtByScope,
            [scopeKey]: Date.now()
          }
        }));
      } catch (error) {
        set({
          postsLoading: false,
          error: resolveErrorMessage(error, "Failed to load posts")
        });
      }
    });
  },

  loadActivity: async (options = {}) => {
    const forceRefresh = options.forceRefresh === true;
    const state = get();

    if (!forceRefresh && isFresh(state.activityFetchedAt)) {
      return;
    }

    await runDeduped("loadActivity", async () => {
      set({ activityLoading: true, error: null });

      try {
        const activity = await fetchActivity();
        set({
          activity,
          activityLoading: false,
          activityFetchedAt: Date.now()
        });
      } catch (error) {
        set({
          activityLoading: false,
          error: resolveErrorMessage(error, "Failed to load activity")
        });
      }
    });
  },

  loadPost: async (id, options = {}) => {
    const forceRefresh = options.forceRefresh === true;
    const state = get();

    if (!forceRefresh && state.currentPost?.id === id && isFresh(state.currentPostFetchedAtById[id])) {
      return;
    }

    await runDeduped(`loadPost:${id}`, async () => {
      set({ currentPostLoading: true, error: null });

      try {
        const post = await fetchPost(id);
        if (!post) {
          set({
            currentPost: null,
            currentPostLoading: false,
            error: "Post not found"
          });
          return;
        }

        set((current) => ({
          currentPost: post,
          currentPostLoading: false,
          currentPostFetchedAtById: {
            ...current.currentPostFetchedAtById,
            [id]: Date.now()
          }
        }));
      } catch (error) {
        set({
          currentPostLoading: false,
          error: resolveErrorMessage(error, "Failed to load post")
        });
      }
    });
  },

  loadAgents: async (options = {}) => {
    const forceRefresh = options.forceRefresh === true;
    const state = get();

    if (!forceRefresh && isFresh(state.agentsFetchedAt)) {
      return;
    }

    await runDeduped("loadAgents", async () => {
      set({ agentsLoading: true, error: null });

      try {
        const nextState = get();
        const agents = await fetchAgents({
          posts: nextState.posts
        });

        set({
          agents,
          agentsLoading: false,
          agentsFetchedAt: Date.now()
        });
      } catch (error) {
        set({
          agentsLoading: false,
          error: resolveErrorMessage(error, "Failed to load agents")
        });
      }
    });
  },

  loadAgentProfile: async (slug, options = {}) => {
    const normalizedSlug = slug.trim();
    if (!normalizedSlug) {
      return;
    }

    const forceRefresh = options.forceRefresh === true;
    const state = get();

    if (
      !forceRefresh &&
      state.currentAgent?.slug === normalizedSlug &&
      isFresh(state.currentAgentFetchedAtBySlug[normalizedSlug])
    ) {
      return;
    }

    await runDeduped(`loadAgentProfile:${normalizedSlug}`, async () => {
      set({ currentAgentLoading: true, error: null });

      try {
        const [agent, activity] = await Promise.all([
          fetchAgent(normalizedSlug),
          fetchAgentActivity(normalizedSlug)
        ]);

        if (!agent) {
          set({
            currentAgent: null,
            currentAgentActivity: [],
            currentAgentLoading: false,
            error: "Agent not found"
          });
          return;
        }

        set((current) => ({
          currentAgent: agent,
          currentAgentActivity: activity,
          currentAgentLoading: false,
          currentAgentFetchedAtBySlug: {
            ...current.currentAgentFetchedAtBySlug,
            [normalizedSlug]: Date.now()
          }
        }));
      } catch (error) {
        set({
          currentAgentLoading: false,
          error: resolveErrorMessage(error, "Failed to load agent profile")
        });
      }
    });
  },

  loadUserProfile: async (username, options = {}) => {
    const normalizedUsername = username.trim();
    if (!normalizedUsername) {
      return;
    }

    const forceRefresh = options.forceRefresh === true;
    const state = get();

    if (!forceRefresh && state.currentUser?.username === normalizedUsername) {
      return;
    }

    await runDeduped(`loadUserProfile:${normalizedUsername}`, async () => {
      set({ error: null });

      try {
        const user = await fetchUserProfile(normalizedUsername);
        if (!user) {
          set({
            currentUser: null,
            error: "User not found"
          });
          return;
        }

        set({ currentUser: user });
      } catch (error) {
        set({
          error: resolveErrorMessage(error, "Failed to load user profile")
        });
      }
    });
  },

  loadLeaderboard: async (timeframe = "all", options = {}) => {
    const forceRefresh = options.forceRefresh === true;
    const state = get();

    if (!forceRefresh && isFresh(state.leaderboardFetchedAtByTimeframe[timeframe])) {
      return;
    }

    await runDeduped(`loadLeaderboard:${timeframe}`, async () => {
      set({ leaderboardLoading: true, error: null });

      try {
        const nextState = get();
        const leaderboard = await fetchLeaderboard(timeframe, {
          quorums: nextState.quorums.length ? nextState.quorums : undefined,
          posts: nextState.posts.length ? nextState.posts : undefined
        });

        set((current) => ({
          leaderboard,
          leaderboardLoading: false,
          leaderboardFetchedAtByTimeframe: {
            ...current.leaderboardFetchedAtByTimeframe,
            [timeframe]: Date.now()
          }
        }));
      } catch (error) {
        set({
          leaderboardLoading: false,
          error: resolveErrorMessage(error, "Failed to load leaderboard")
        });
      }
    });
  },

  loadExploreGraph: async (quorum, options = {}) => {
    const scopeKey = getScopeKey(quorum);
    const forceRefresh = options.forceRefresh === true;
    const state = get();

    if (!forceRefresh && isFresh(state.exploreFetchedAtByScope[scopeKey])) {
      return;
    }

    await runDeduped(`loadExploreGraph:${scopeKey}`, async () => {
      set({ exploreLoading: true, error: null });

      try {
        const nextState = get();
        const exploreGraph = await fetchExploreGraph(quorum, {
          posts: nextState.posts.length ? nextState.posts : undefined
        });

        set((current) => ({
          exploreGraph,
          exploreLoading: false,
          exploreFetchedAtByScope: {
            ...current.exploreFetchedAtByScope,
            [scopeKey]: Date.now()
          }
        }));
      } catch (error) {
        set({
          exploreLoading: false,
          error: resolveErrorMessage(error, "Failed to load explore graph")
        });
      }
    });
  },

  loadHealth: async (options = {}) => {
    const forceRefresh = options.forceRefresh === true;
    const state = get();

    if (!forceRefresh && isFresh(state.healthFetchedAt)) {
      return;
    }

    await runDeduped("loadHealth", async () => {
      set({ healthLoading: true });

      try {
        const health = await fetchHealth();
        set({
          health: { status: health.status, ok: true },
          healthLoading: false,
          healthFetchedAt: Date.now()
        });
      } catch {
        set({
          health: { status: "offline", ok: false },
          healthLoading: false,
          healthFetchedAt: Date.now()
        });
      }
    });
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
        error: resolveErrorMessage(error, "Failed to load analysis runs")
      });
    }
  },

  startAnalysisForPost: async (postId) => {
    if (isReadOnlyApp()) {
      return null;
    }

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
        error: resolveErrorMessage(error, "Failed to start analysis")
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
      currentPost && currentPost.id === currentPostId
        ? fetchPost(currentPostId)
        : Promise.resolve(null)
    ]);

    set({
      analysisRuns: runs,
      analysisEvents: events,
      currentPost: refreshedPost ?? currentPost
    });
  },

  cancelCurrentAnalysis: async () => {
    if (isReadOnlyApp()) {
      return;
    }

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

  setSortMode: (sortMode) => {
    set((state) => ({
      sortMode,
      posts: sortPosts(state.posts, sortMode)
    }));
  },

  votePost: async (postId) => {
    if (isReadOnlyApp()) {
      return;
    }

    const previousState = get();
    const previousPosts = previousState.posts;
    const previousCurrentPost = previousState.currentPost;

    set((state) => ({
      posts: sortPosts(
        state.posts.map((post) =>
          post.id === postId
            ? {
                ...post,
                votes: post.votes + 1
              }
            : post
        ),
        state.sortMode
      ),
      currentPost:
        state.currentPost && state.currentPost.id === postId
          ? {
              ...state.currentPost,
              votes: state.currentPost.votes + 1
            }
          : state.currentPost
    }));

    try {
      const updatedPost = await vote(postId);

      if (!updatedPost) {
        set({
          posts: previousPosts,
          currentPost: previousCurrentPost
        });
        return;
      }

      set((state) => ({
        posts: sortPosts(
          state.posts.map((post) => (post.id === updatedPost.id ? updatedPost : post)),
          state.sortMode
        ),
        currentPost:
          state.currentPost && state.currentPost.id === updatedPost.id
            ? {
                ...state.currentPost,
                votes: updatedPost.votes
              }
            : state.currentPost
      }));
    } catch {
      set({
        posts: previousPosts,
        currentPost: previousCurrentPost
      });
    }
  },

  createPost: async (input) => {
    if (isReadOnlyApp()) {
      return null;
    }

    try {
      const createdPost = await submitPost(input);
      const shouldInclude = get().selectedQuorum ? get().selectedQuorum === createdPost.quorum : true;

      set((state) => ({
        posts: shouldInclude
          ? sortPosts([createdPost, ...state.posts], state.sortMode)
          : state.posts,
        postsFetchedAtByScope: {
          ...state.postsFetchedAtByScope,
          [getScopeKey(state.selectedQuorum ?? undefined)]: Date.now()
        }
      }));

      return createdPost;
    } catch {
      return null;
    }
  },

  submitReplyToCurrentPost: async (body, parentId = null) => {
    if (isReadOnlyApp()) {
      return false;
    }

    const currentPost = get().currentPost;
    if (!currentPost || !body.trim()) {
      return false;
    }

    const previousCurrentPost = currentPost;
    const previousPosts = get().posts;

    set((state) => ({
      replySubmitting: true,
      currentPost:
        state.currentPost && state.currentPost.id === currentPost.id
          ? {
              ...state.currentPost,
              replyCount: state.currentPost.replyCount + 1
            }
          : state.currentPost,
      posts: state.posts.map((post) =>
        post.id === currentPost.id
          ? {
              ...post,
              replyCount: post.replyCount + 1
            }
          : post
      )
    }));

    try {
      const updatedPost = await submitReply({
        postId: currentPost.id,
        body,
        parentId
      });

      if (!updatedPost) {
        set({
          replySubmitting: false,
          currentPost: previousCurrentPost,
          posts: previousPosts
        });
        return false;
      }

      set((state) => ({
        replySubmitting: false,
        currentPost: updatedPost,
        posts: state.posts.map((post) =>
          post.id === updatedPost.id
            ? {
                ...post,
                replyCount: updatedPost.replyCount
              }
            : post
        )
      }));

      return true;
    } catch {
      set({
        replySubmitting: false,
        currentPost: previousCurrentPost,
        posts: previousPosts
      });
      return false;
    }
  }
}));

function runDeduped<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const existing = inflightRequests.get(key) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }

  const promise = loader().finally(() => {
    inflightRequests.delete(key);
  });

  inflightRequests.set(key, promise as Promise<unknown>);
  return promise;
}

function isFresh(fetchedAt?: number | null, staleMs = RESOURCE_STALE_MS): boolean {
  if (typeof fetchedAt !== "number") {
    return false;
  }
  return Date.now() - fetchedAt < staleMs;
}

function resolveErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function getScopeKey(scope?: string): string {
  return scope?.trim() || "all";
}

function sortPosts(posts: Post[], mode: SortMode): Post[] {
  const copy = [...posts];

  return copy.sort((a, b) => {
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }

    if (mode === "consensus") {
      return b.consensus - a.consensus;
    }

    if (mode === "new") {
      return parseTimestamp(b.createdAt) - parseTimestamp(a.createdAt);
    }

    return scorePost(b) - scorePost(a);
  });
}

function scorePost(post: Post): number {
  const pinBoost = post.isPinned ? 400 : 0;
  return post.votes * 0.65 + post.consensus * 0.35 + post.replyCount * 0.25 + pinBoost;
}

function parseTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
