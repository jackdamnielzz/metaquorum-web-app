"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, UserRound } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { PostCard } from "@/components/post/post-card";
import { PageTransition } from "@/components/shared/page-transition";
import { Badge } from "@/components/ui/badge";
import {
  DEFAULT_PROFILE_SETTINGS,
  loadProfileSettings,
  PROFILE_SETTINGS_EVENT
} from "@/lib/profile-settings";
import { useAppStore } from "@/lib/store";
import { UserProfile } from "@/lib/types";

export default function UserProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params?.username ?? "";
  const [profileSettings, setProfileSettings] = useState(DEFAULT_PROFILE_SETTINGS);

  const quorums = useAppStore((state) => state.quorums);
  const posts = useAppStore((state) => state.posts);
  const agents = useAppStore((state) => state.agents);
  const currentUser = useAppStore((state) => state.currentUser);
  const health = useAppStore((state) => state.health);
  const isLoading = useAppStore((state) => state.isLoading);
  const error = useAppStore((state) => state.error);
  const loadHome = useAppStore((state) => state.loadHome);
  const loadAgents = useAppStore((state) => state.loadAgents);
  const loadUserProfile = useAppStore((state) => state.loadUserProfile);
  const loadHealth = useAppStore((state) => state.loadHealth);

  useEffect(() => {
    if (!username) {
      return;
    }
    loadHome();
    loadAgents();
    loadUserProfile(username);
    loadHealth();
  }, [username, loadHome, loadAgents, loadUserProfile, loadHealth]);

  useEffect(() => {
    const applyProfile = () => {
      setProfileSettings(loadProfileSettings());
    };
    applyProfile();
    window.addEventListener(PROFILE_SETTINGS_EVENT, applyProfile);
    return () => window.removeEventListener(PROFILE_SETTINGS_EVENT, applyProfile);
  }, []);

  const fallbackUser = useMemo<UserProfile | null>(() => {
    if (!username || username.toLowerCase() !== profileSettings.username.toLowerCase()) {
      return null;
    }
    const authoredPosts = posts.filter(
      (post) => post.author.type === "human" && post.author.username.toLowerCase() === username.toLowerCase()
    );
    const totalVotes = authoredPosts.reduce((sum, post) => sum + post.votes, 0);
    const totalReplies = authoredPosts.reduce((sum, post) => sum + post.replyCount, 0);
    return {
      id: `u-${profileSettings.username}`,
      username: profileSettings.username,
      joinedAt: "2026-01-01",
      bio: profileSettings.bio,
      stats: {
        posts: authoredPosts.length,
        totalVotes,
        totalReplies
      },
      posts: authoredPosts
    };
  }, [posts, profileSettings, username]);

  const shownUser = currentUser ?? fallbackUser;

  return (
    <>
      <Navbar quorums={quorums} posts={posts} agents={agents} health={health} />
      <PageTransition>
        <main className="page-shell py-6">
          <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Back to home
          </Link>

          {error && !shownUser ? <p className="text-sm text-red-600">{error}</p> : null}
          {isLoading && !shownUser ? (
            <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading profile...</div>
          ) : null}

          {shownUser ? (
            <>
              <section className="rounded-xl border border-border bg-card p-5 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                        <UserRound className="h-5 w-5" />
                      </div>
                      <div>
                        <h1 className="font-heading text-2xl font-semibold tracking-tight">@{shownUser.username}</h1>
                        <p className="text-sm text-muted-foreground">Joined {shownUser.joinedAt}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{shownUser.bio}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{shownUser.stats.posts} posts</Badge>
                    <Badge variant="outline">{shownUser.stats.totalVotes} votes</Badge>
                    <Badge variant="outline">{shownUser.stats.totalReplies} replies</Badge>
                  </div>
                </div>
              </section>

              <section className="mt-4 space-y-3">
                {shownUser.posts.length ? (
                  shownUser.posts.map((post) => <PostCard key={post.id} post={post} showQuorum />)
                ) : (
                  <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
                    No posts yet.
                  </div>
                )}
              </section>
            </>
          ) : null}
        </main>
      </PageTransition>
    </>
  );
}
