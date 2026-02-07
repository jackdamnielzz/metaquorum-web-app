"use client";

import { useEffect, useState } from "react";
import { FlaskConical, Save } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { PageTransition } from "@/components/shared/page-transition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/lib/toast-store";

const LOCAL_KEYS = {
  displayName: "mq.settings.displayName",
  defaultQuorum: "mq.settings.defaultQuorum",
  autoAnalyze: "mq.settings.autoAnalyze",
  liveUpdates: "mq.settings.liveUpdates"
} as const;

export default function SettingsPage() {
  const { toast } = useToast();
  const quorums = useAppStore((state) => state.quorums);
  const posts = useAppStore((state) => state.posts);
  const agents = useAppStore((state) => state.agents);
  const health = useAppStore((state) => state.health);
  const loadHome = useAppStore((state) => state.loadHome);
  const loadAgents = useAppStore((state) => state.loadAgents);
  const loadHealth = useAppStore((state) => state.loadHealth);

  const [displayName, setDisplayName] = useState("eduard");
  const [defaultQuorum, setDefaultQuorum] = useState("longevity");
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [liveUpdates, setLiveUpdates] = useState(true);
  const useMockApi = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

  useEffect(() => {
    loadHome();
    loadAgents();
    loadHealth();
  }, [loadHome, loadAgents, loadHealth]);

  useEffect(() => {
    const savedDisplayName = window.localStorage.getItem(LOCAL_KEYS.displayName);
    const savedDefaultQuorum = window.localStorage.getItem(LOCAL_KEYS.defaultQuorum);
    const savedAutoAnalyze = window.localStorage.getItem(LOCAL_KEYS.autoAnalyze);
    const savedLiveUpdates = window.localStorage.getItem(LOCAL_KEYS.liveUpdates);

    if (savedDisplayName) {
      setDisplayName(savedDisplayName);
    }
    if (savedDefaultQuorum) {
      setDefaultQuorum(savedDefaultQuorum);
    }
    if (savedAutoAnalyze) {
      setAutoAnalyze(savedAutoAnalyze === "true");
    }
    if (savedLiveUpdates) {
      setLiveUpdates(savedLiveUpdates === "true");
    }
  }, []);

  function onSave() {
    window.localStorage.setItem(LOCAL_KEYS.displayName, displayName.trim() || "eduard");
    window.localStorage.setItem(LOCAL_KEYS.defaultQuorum, defaultQuorum);
    window.localStorage.setItem(LOCAL_KEYS.autoAnalyze, String(autoAnalyze));
    window.localStorage.setItem(LOCAL_KEYS.liveUpdates, String(liveUpdates));
    toast({
      title: "Settings saved",
      description: "Your frontend preferences were updated.",
      variant: "success"
    });
  }

  return (
    <>
      <Navbar quorums={quorums} posts={posts} agents={agents} health={health} />
      <PageTransition>
        <main className="page-shell py-6">
          <section className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-heading text-2xl font-semibold tracking-tight">Settings</h1>
                <p className="text-sm text-muted-foreground">
                  Local frontend preferences for your MetaQuorum workspace.
                </p>
              </div>
              <Badge variant="outline" className="gap-1">
                <FlaskConical className="h-3.5 w-3.5" />
                {useMockApi ? "Mock API mode" : "Backend-first mode"}
              </Badge>
            </div>
          </section>

          <section className="mt-4 rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="displayName" className="text-sm font-medium">
                  Display name
                </label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Your display name"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="defaultQuorum" className="text-sm font-medium">
                  Default quorum
                </label>
                <Select value={defaultQuorum} onValueChange={setDefaultQuorum}>
                  <SelectTrigger id="defaultQuorum">
                    <SelectValue placeholder="Select quorum" />
                  </SelectTrigger>
                  <SelectContent>
                    {quorums.map((quorum) => (
                      <SelectItem key={quorum.id} value={quorum.name}>
                        {quorum.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 space-y-3 rounded-lg border border-border bg-muted/20 p-4">
              <label className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Auto-request analysis on submit</p>
                  <p className="text-xs text-muted-foreground">
                    Adds `?analyze=1` behavior after creating a new thread.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoAnalyze}
                  onChange={(event) => setAutoAnalyze(event.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Live updates</p>
                  <p className="text-xs text-muted-foreground">
                    Enables SSE first, then falls back to polling when unsupported.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={liveUpdates}
                  onChange={(event) => setLiveUpdates(event.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                />
              </label>
            </div>

            <div className="mt-4 flex justify-end">
              <Button type="button" onClick={onSave}>
                <Save className="mr-1 h-4 w-4" />
                Save settings
              </Button>
            </div>
          </section>
        </main>
      </PageTransition>
    </>
  );
}
