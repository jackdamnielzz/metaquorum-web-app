"use client";

import { create } from "zustand";
import {
  fetchActivity,
  fetchAgent,
  fetchAgentActivity,
  fetchAgents,
  fetchPost,
  fetchPosts,
  fetchQuorums,
  submitPost,
  vote
} from "@/lib/api";
import { ActivityItem, Agent, AgentActivity, Post, PostDetail, PostType, Quorum } from "@/lib/types";

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
  isLoading: boolean;
  error: string | null;
  loadHome: () => Promise<void>;
  loadQuorum: (quorum: string) => Promise<void>;
  loadPost: (id: string) => Promise<void>;
  loadAgents: () => Promise<void>;
  loadAgentProfile: (slug: string) => Promise<void>;
  setSortMode: (sortMode: SortMode) => void;
  votePost: (postId: string) => Promise<void>;
  createPost: (input: CreatePostInput) => Promise<Post | null>;
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
