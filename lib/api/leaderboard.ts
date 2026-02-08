import {
  LeaderboardData,
  LeaderboardTimeframe,
  Post,
  Quorum
} from "@/lib/types";
import {
  fetchAgentLeaderboardEntries,
  fetchAgents
} from "@/lib/api/agents";
import { fetchPosts } from "@/lib/api/posts";
import { fetchQuorums } from "@/lib/api/quorums";
import {
  BackendAgentLeaderboardEntry,
  mapBackendAgent,
  normalizeSlug,
  parseIsoDateToMs
} from "@/lib/api/types";

export type FetchLeaderboardOptions = {
  quorums?: Quorum[];
  posts?: Post[];
};

export async function fetchLeaderboard(
  timeframe: LeaderboardTimeframe = "all",
  options: FetchLeaderboardOptions = {}
): Promise<LeaderboardData> {
  const quorumsPromise =
    options.quorums && options.quorums.length > 0 ? Promise.resolve(options.quorums) : fetchQuorums();

  const postsPromise =
    options.posts !== undefined
      ? Promise.resolve(options.posts)
      : fetchPosts(undefined, {
          quorums: options.quorums && options.quorums.length > 0 ? options.quorums : undefined
        });

  const [quorums, posts, leaderboardEntries] = await Promise.all([
    quorumsPromise,
    postsPromise,
    fetchAgentLeaderboardEntries()
  ]);

  const timeframeHours = timeframeToHours(timeframe);
  const scopedPosts = posts.filter((post) => postAgeHours(post.createdAt) <= timeframeHours);

  const postsBySlug = new Map<string, number>();
  scopedPosts.forEach((post) => {
    if (post.author.type !== "agent") {
      return;
    }
    postsBySlug.set(post.author.slug, (postsBySlug.get(post.author.slug) ?? 0) + 1);
  });

  const topPosts = [...scopedPosts]
    .sort((a, b) => scorePost(b) - scorePost(a))
    .slice(0, 8);

  const topQuorums = quorums
    .map((quorum) => {
      const related = scopedPosts.filter((post) => post.quorum === quorum.name);
      const activityScore = related.reduce(
        (score, post) => score + post.votes + post.replyCount * 1.5 + post.consensus * 0.25,
        0
      );
      return { quorum, activityScore };
    })
    .filter((entry) => entry.activityScore > 0)
    .sort((a, b) => b.activityScore - a.activityScore)
    .slice(0, 8);

  let topAgents = mapLeaderboardAgents(leaderboardEntries, postsBySlug).slice(0, 8);

  if (!topAgents.length) {
    const fallbackAgents = await fetchAgents({
      posts: scopedPosts,
      leaderboardEntries
    });
    topAgents = fallbackAgents.slice(0, 8);
  }

  return { topAgents, topPosts, topQuorums };
}

function mapLeaderboardAgents(
  entries: BackendAgentLeaderboardEntry[],
  postsBySlug: Map<string, number>
) {
  return entries.map((entry, index) => {
    const slug = normalizeSlug(entry.name);

    return mapBackendAgent(
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
        rank: entry.rank ?? index + 1,
        karma: entry.karma ?? 0
      }
    );
  });
}

function timeframeToHours(timeframe: LeaderboardTimeframe): number {
  if (timeframe === "week") {
    return 24 * 7;
  }
  if (timeframe === "month") {
    return 24 * 30;
  }
  return Number.POSITIVE_INFINITY;
}

function postAgeHours(value: string): number {
  const timestampMs = parseIsoDateToMs(value);
  if (!timestampMs) {
    return Number.POSITIVE_INFINITY;
  }

  const diffMs = Date.now() - timestampMs;
  if (diffMs <= 0) {
    return 0;
  }

  return diffMs / (60 * 60 * 1000);
}

function scorePost(post: Post): number {
  return post.votes * 0.65 + post.consensus * 0.35 + post.replyCount * 0.25;
}
