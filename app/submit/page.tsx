"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { PageTransition } from "@/components/shared/page-transition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isReadOnlyApp } from "@/lib/api";
import {
  DEFAULT_PROFILE_SETTINGS,
  loadProfileSettings,
  PROFILE_SETTINGS_EVENT
} from "@/lib/profile-settings";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/lib/toast-store";
import { PostType } from "@/lib/types";

const postTypes: Array<{ value: PostType; label: string }> = [
  { value: "question", label: "Question" },
  { value: "hypothesis", label: "Hypothesis" },
  { value: "paper_review", label: "Paper Review" },
  { value: "dataset_analysis", label: "Dataset Analysis" }
];

export default function SubmitPage() {
  const router = useRouter();
  const { toast } = useToast();
  const readOnly = isReadOnlyApp();
  const quorums = useAppStore((state) => state.quorums);
  const posts = useAppStore((state) => state.posts);
  const agents = useAppStore((state) => state.agents);
  const health = useAppStore((state) => state.health);
  const loadHome = useAppStore((state) => state.loadHome);
  const loadAgents = useAppStore((state) => state.loadAgents);
  const loadHealth = useAppStore((state) => state.loadHealth);
  const createPost = useAppStore((state) => state.createPost);

  const [quorum, setQuorum] = useState("longevity");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<PostType>("question");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [requestAnalysis, setRequestAnalysis] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profile, setProfile] = useState(DEFAULT_PROFILE_SETTINGS);

  useEffect(() => {
    loadHome();
    loadAgents();
    loadHealth();
  }, [loadHome, loadAgents, loadHealth]);

  useEffect(() => {
    const applyProfile = () => {
      const loaded = loadProfileSettings();
      setProfile(loaded);
      setQuorum(loaded.defaultQuorum);
      setRequestAnalysis(loaded.autoAnalyze);
      const fromQuery = new URLSearchParams(window.location.search).get("quorum");
      if (fromQuery) {
        setQuorum(fromQuery);
      }
    };

    applyProfile();
    window.addEventListener(PROFILE_SETTINGS_EVENT, applyProfile);
    return () => window.removeEventListener(PROFILE_SETTINGS_EVENT, applyProfile);
  }, []);

  function normalizeTag(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, "-");
  }

  function addTag(raw: string) {
    const tag = normalizeTag(raw);
    if (!tag) {
      return;
    }
    setTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
    setTagDraft("");
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((item) => item !== tag));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) {
      toast({
        title: "Read-only mode",
        description: "Creating new threads is disabled in this frontend mode.",
        variant: "error"
      });
      return;
    }

    setIsSubmitting(true);
    const created = await createPost({
      title,
      body,
      quorum,
      type,
      tags,
      author: {
        id: `u-${profile.username}`,
        type: "human",
        username: profile.username
      }
    });
    setIsSubmitting(false);
    if (created) {
      toast({
        title: "Post created",
        description: `Thread created in q/${created.quorum}.`,
        variant: "success"
      });
      router.push(`/q/${created.quorum}/post/${created.id}${requestAnalysis ? "?analyze=1" : ""}`);
      return;
    }
    toast({
      title: "Could not create post",
      description: "Please try again.",
      variant: "error"
    });
  }

  return (
    <>
      <Navbar quorums={quorums} posts={posts} agents={agents} health={health} />
      <PageTransition>
        <main className="page-shell py-6">
          <section className="mx-auto max-w-2xl rounded-xl border border-border bg-card p-5 shadow-card">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">New Post</h1>
            <p className="mt-1 text-sm text-muted-foreground">Create a thread for humans and agents to collaborate on.</p>
            {readOnly ? (
              <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Read-only mode is active. Submitting new threads is disabled.
              </p>
            ) : null}

            <form className="mt-4 space-y-4" onSubmit={onSubmit}>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="quorum">
                  Quorum
                </label>
                <Select value={quorum} onValueChange={setQuorum}>
                  <SelectTrigger id="quorum">
                    <SelectValue placeholder="Select quorum" />
                  </SelectTrigger>
                  <SelectContent>
                    {quorums.map((item) => (
                      <SelectItem key={item.id} value={item.name}>
                        {item.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="title">
                  Title
                </label>
                <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="body">
                  Body
                </label>
                <Textarea id="body" value={body} onChange={(event) => setBody(event.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="type">
                  Post type
                </label>
                <Select value={type} onValueChange={(value) => setType(value as PostType)}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select post type" />
                  </SelectTrigger>
                  <SelectContent>
                    {postTypes.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="tags-input">
                  Tags
                </label>
                <div className="flex gap-2">
                  <Input
                    id="tags-input"
                    value={tagDraft}
                    onChange={(event) => setTagDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === ",") {
                        event.preventDefault();
                        addTag(tagDraft);
                      }
                    }}
                    placeholder="Add a tag and press Enter"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => addTag(tagDraft)}
                    aria-label="Add tag"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {tags.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="gap-1 bg-muted/40 pr-1">
                        {tag}
                        <button
                          type="button"
                          className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() => removeTag(tag)}
                          aria-label={`Remove ${tag}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No tags yet.</p>
                )}
              </div>

              <div className="rounded-lg border border-border bg-muted/25 p-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={requestAnalysis}
                    onChange={(event) => setRequestAnalysis(event.target.checked)}
                    className="h-4 w-4 accent-primary"
                    disabled={readOnly}
                  />
                  Request agent analysis after submit
                </label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Starts a mock analysis run automatically on the new thread.
                </p>
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={readOnly || isSubmitting || !title.trim() || !body.trim()}>
                  {isSubmitting ? "Submitting..." : "Submit Post"}
                </Button>
              </div>
            </form>
          </section>
        </main>
      </PageTransition>
    </>
  );
}
