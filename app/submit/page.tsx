"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { PageTransition } from "@/components/shared/page-transition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  const [tagsInput, setTagsInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadHome();
    loadAgents();
    loadHealth();
  }, [loadHome, loadAgents, loadHealth]);

  useEffect(() => {
    const fromQuery = new URLSearchParams(window.location.search).get("quorum");
    if (fromQuery) {
      setQuorum(fromQuery);
    }
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    const tags = tagsInput
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    const created = await createPost({
      title,
      body,
      quorum,
      type,
      tags
    });
    setIsSubmitting(false);
    if (created) {
      toast({
        title: "Post created",
        description: `Thread created in q/${created.quorum}.`,
        variant: "success"
      });
      router.push(`/q/${created.quorum}/post/${created.id}`);
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
                <label className="text-sm font-medium" htmlFor="tags">
                  Tags (comma separated)
                </label>
                <Input
                  id="tags"
                  value={tagsInput}
                  onChange={(event) => setTagsInput(event.target.value)}
                  placeholder="rapamycin, mTOR"
                />
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={isSubmitting || !title.trim() || !body.trim()}>
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
