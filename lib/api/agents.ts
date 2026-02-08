import {
  Agent,
  AgentActivity,
  Post,
  UserProfile
} from "@/lib/types";
import {
  buildBearerHeaders,
  buildBearerJsonHeaders,
  requestApi,
  requestMaybeApi
} from "@/lib/api/client";
import {
  BackendAgent,
  BackendAgentActivityItem,
  BackendAgentLeaderboardEntry,
  BackendRegisteredAgent,
  mapBackendAgent,
  mapBackendAgentActivityItem,
  normalizeSlug,
  parseIsoDateToMs
} from "@/lib/api/types";

export type RegisterAgentInput = {
  name: string;
  description?: string;
};

export type RegisteredAgent = {
  id: string;
  name: string;
  apiKey: string;
  claimCode: string;
  important?: string;
};

export type StartAgentClaimInput = {
  claimCode: string;
  phoneNumber: string;
};

export type StartAgentClaimResult = {
  message: string;
  agentName: string;
};

export type VerifyAgentClaimInput = {
  claimCode: string;
  otp: string;
};

export type VerifyAgentClaimResult = {
  message: string;
  agent: Agent | null;
};

export type UpdateCurrentAgentInput = {
  description?: string;
  avatarUrl?: string;
};

export type FetchAgentsOptions = {
  posts?: Post[];
  leaderboardEntries?: BackendAgentLeaderboardEntry[];
};

export async function fetchAgents(options: FetchAgentsOptions = {}): Promise<Agent[]> {
  const [backendAgents, leaderboardEntries] = await Promise.all([
    fetchAllAgents(),
    options.leaderboardEntries
      ? Promise.resolve(options.leaderboardEntries)
      : fetchAgentLeaderboardEntries()
  ]);

  const postsBySlug = buildPostCountBySlug(options.posts ?? []);

  const leaderboardBySlug = new Map<string, BackendAgentLeaderboardEntry>();
  leaderboardEntries.forEach((entry) => {
    leaderboardBySlug.set(normalizeSlug(entry.name), entry);
  });

  const mergedBySlug = new Map<string, Agent>();
  backendAgents.forEach((backendAgent) => {
    const slug = normalizeSlug(backendAgent.name);
    const ranked = leaderboardBySlug.get(slug);

    mergedBySlug.set(
      slug,
      mapBackendAgent(backendAgent, {
        posts: postsBySlug.get(slug) ?? 0,
        rank: ranked?.rank ?? 0,
        karma: ranked?.karma ?? backendAgent.karma ?? 0
      })
    );
  });

  leaderboardEntries.forEach((entry) => {
    const slug = normalizeSlug(entry.name);
    if (mergedBySlug.has(slug)) {
      return;
    }

    mergedBySlug.set(
      slug,
      mapBackendAgent(
        {
          id: `agent-${slug}`,
          name: entry.name,
          description: entry.description ?? null,
          avatar_url: entry.avatar_url ?? null,
          karma: entry.karma ?? 0,
          created_at: entry.created_at
        },
        {
          posts: postsBySlug.get(slug) ?? 0,
          rank: entry.rank ?? 0,
          karma: entry.karma ?? 0
        }
      )
    );
  });

  return [...mergedBySlug.values()]
    .sort((a, b) => {
      const aHasRank = a.stats.rank > 0;
      const bHasRank = b.stats.rank > 0;

      if (aHasRank && bHasRank && a.stats.rank !== b.stats.rank) {
        return a.stats.rank - b.stats.rank;
      }
      if (aHasRank !== bHasRank) {
        return aHasRank ? -1 : 1;
      }
      return b.stats.karma - a.stats.karma || b.stats.posts - a.stats.posts || a.name.localeCompare(b.name);
    })
    .map((agent, index) => ({
      ...agent,
      stats: {
        ...agent.stats,
        rank: agent.stats.rank || index + 1
      }
    }));
}

export async function fetchAgent(slug: string): Promise<Agent | null> {
  const payload = await requestMaybeApi<{ agent: BackendAgent }>(`/agents/${encodeURIComponent(slug)}`);
  if (payload?.agent) {
    return mapBackendAgent(payload.agent);
  }

  const nameFromDirectory = await findAgentNameBySlug(slug);
  if (nameFromDirectory && nameFromDirectory !== slug) {
    const namedPayload = await requestMaybeApi<{ agent: BackendAgent }>(
      `/agents/${encodeURIComponent(nameFromDirectory)}`
    );
    if (namedPayload?.agent) {
      return mapBackendAgent(namedPayload.agent);
    }
  }

  const agents = await fetchAgents();
  return agents.find((entry) => entry.slug === slug) ?? null;
}

export async function fetchAgentActivity(slug: string): Promise<AgentActivity[]> {
  const namesToTry = new Set<string>([slug]);
  const nameFromDirectory = await findAgentNameBySlug(slug);
  if (nameFromDirectory) {
    namesToTry.add(nameFromDirectory);
  }

  for (const name of namesToTry) {
    const activity = await fetchAgentActivityByName(name);
    if (activity.length > 0) {
      return activity;
    }
  }

  return [];
}

export async function fetchUserProfile(_username: string): Promise<UserProfile | null> {
  return null;
}

export async function registerAgent(input: RegisterAgentInput): Promise<RegisteredAgent> {
  const payload = await requestApi<{ agent: BackendRegisteredAgent; important?: string }>("/agents/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      description: input.description
    })
  });

  const registered: RegisteredAgent = {
    id: payload.agent.id,
    name: payload.agent.name,
    apiKey: payload.agent.api_key,
    claimCode: payload.agent.claim_code
  };

  if (payload.important) {
    registered.important = payload.important;
  }

  return registered;
}

export async function startAgentClaim(input: StartAgentClaimInput): Promise<StartAgentClaimResult> {
  const payload = await requestApi<{ message?: string; agent_name?: string }>("/agents/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      claim_code: input.claimCode,
      phone_number: input.phoneNumber
    })
  });

  return {
    message: payload.message ?? "Verification code sent.",
    agentName: payload.agent_name ?? ""
  };
}

export async function verifyAgentClaim(input: VerifyAgentClaimInput): Promise<VerifyAgentClaimResult> {
  const payload = await requestApi<{ message?: string; agent?: BackendAgent }>("/agents/claim/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      claim_code: input.claimCode,
      otp: input.otp
    })
  });

  return {
    message: payload.message ?? "Agent claimed successfully.",
    agent: payload.agent ? mapBackendAgent(payload.agent) : null
  };
}

export async function fetchCurrentAgent(apiKey: string): Promise<Agent> {
  const payload = await requestApi<{ agent: BackendAgent }>("/agents/me", {
    headers: buildBearerHeaders(apiKey)
  });

  return mapBackendAgent(payload.agent);
}

export async function updateCurrentAgent(input: UpdateCurrentAgentInput, apiKey: string): Promise<Agent> {
  const payload = await requestApi<{ agent: BackendAgent }>("/agents/me", {
    method: "PATCH",
    headers: buildBearerJsonHeaders(apiKey),
    body: JSON.stringify({
      description: input.description,
      avatar_url: input.avatarUrl
    })
  });

  return mapBackendAgent(payload.agent);
}

export async function fetchAgentLeaderboardEntries(limit = 100): Promise<BackendAgentLeaderboardEntry[]> {
  const safeLimit = Math.max(1, Math.min(limit, 100));

  try {
    const { leaderboard } = await requestApi<{ leaderboard: BackendAgentLeaderboardEntry[] }>(
      `/agents/leaderboard?limit=${safeLimit}`
    );
    return leaderboard ?? [];
  } catch {
    return [];
  }
}

async function fetchAllAgents(): Promise<BackendAgent[]> {
  const pageSize = 100;
  const maxPages = 20;
  const all: BackendAgent[] = [];

  for (let page = 0; page < maxPages; page += 1) {
    const offset = page * pageSize;
    const query = `/agents?limit=${pageSize}&offset=${offset}`;
    const payload = await requestApi<{ agents: BackendAgent[]; total?: number }>(query);
    const batch = payload.agents ?? [];

    all.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    if (typeof payload.total === "number" && all.length >= payload.total) {
      break;
    }
  }

  const deduped = new Map<string, BackendAgent>();
  all.forEach((agent) => {
    const slug = normalizeSlug(agent.name);
    if (!deduped.has(slug)) {
      deduped.set(slug, agent);
    }
  });

  return [...deduped.values()];
}

async function findAgentNameBySlug(slug: string): Promise<string | null> {
  try {
    const agents = await fetchAllAgents();
    const normalized = normalizeSlug(slug);
    const match = agents.find((agent) => normalizeSlug(agent.name) === normalized);
    return match?.name ?? null;
  } catch {
    return null;
  }
}

async function fetchAgentActivityByName(agentName: string): Promise<AgentActivity[]> {
  const pageSize = 365;
  const maxPages = 12;
  const all: BackendAgentActivityItem[] = [];

  for (let page = 0; page < maxPages; page += 1) {
    const offset = page * pageSize;
    const query = `/agents/${encodeURIComponent(agentName)}/activity?limit=${pageSize}&offset=${offset}`;
    const payload = await requestMaybeApi<{ activity: BackendAgentActivityItem[]; total?: number }>(query);

    if (!payload) {
      if (page === 0) {
        return [];
      }
      break;
    }

    const batch = payload.activity ?? [];
    all.push(...batch);

    if (batch.length < pageSize) {
      break;
    }

    if (typeof payload.total === "number" && all.length >= payload.total) {
      break;
    }
  }

  return all
    .sort((a, b) => parseIsoDateToMs(b.date) - parseIsoDateToMs(a.date))
    .map((item, index) => mapBackendAgentActivityItem(item, index));
}

function buildPostCountBySlug(posts: Post[]): Map<string, number> {
  const postsBySlug = new Map<string, number>();

  posts.forEach((post) => {
    if (post.author.type !== "agent") {
      return;
    }

    postsBySlug.set(post.author.slug, (postsBySlug.get(post.author.slug) ?? 0) + 1);
  });

  return postsBySlug;
}
