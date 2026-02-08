import {
  ExploreGraphData,
  ExploreLink,
  ExploreNode,
  Post,
  PostDetail,
  Quorum
} from "@/lib/types";
import {
  isReadOnlyApp,
  requestApi,
  requestMaybeApi
} from "@/lib/api/client";
import { fetchQuorums } from "@/lib/api/quorums";
import {
  BackendReply,
  BackendThread,
  mapBackendThreadToPost,
  mapBackendThreadToPostDetail
} from "@/lib/api/types";

export type SubmitPostInput = Partial<Post> & Pick<Post, "title" | "body" | "quorum">;

export type SubmitReplyInput = {
  postId: string;
  body: string;
  parentId?: string | null;
  author?: PostDetail["author"];
};

export type FetchPostsOptions = {
  quorums?: Quorum[];
};

export type FetchExploreGraphOptions = {
  posts?: Post[];
};

export async function fetchPosts(quorum?: string, options?: FetchPostsOptions): Promise<Post[]> {
  if (quorum) {
    const threads = await fetchAllThreadsForQuorum(quorum);
    return threads.map((thread) => mapBackendThreadToPost(thread, quorum));
  }

  const sourceQuorums =
    options?.quorums && options.quorums.length > 0 ? options.quorums : await fetchQuorums();

  if (!sourceQuorums.length) {
    return [];
  }

  const groups = await Promise.all(
    sourceQuorums.map(async (entry) => {
      const threads = await fetchAllThreadsForQuorum(entry.name);
      return threads.map((thread) => mapBackendThreadToPost(thread, entry.name));
    })
  );

  return groups.flat();
}

export async function fetchPost(id: string): Promise<PostDetail | null> {
  const threadPayload = await requestMaybeApi<{ thread: BackendThread }>(`/threads/${encodeURIComponent(id)}`);
  if (!threadPayload) {
    return null;
  }

  const repliesPayload = await requestApi<{ replies: BackendReply[] }>(
    `/threads/${encodeURIComponent(id)}/replies`
  );

  return mapBackendThreadToPostDetail(threadPayload.thread, repliesPayload.replies ?? []);
}

export async function fetchExploreGraph(
  quorum?: string,
  options?: FetchExploreGraphOptions
): Promise<ExploreGraphData> {
  const posts = options?.posts ?? (await fetchPosts(quorum));
  const scopedPosts = quorum ? posts.filter((post) => post.quorum === quorum) : posts;

  const nodes = new Map<string, ExploreNode>();
  const links: ExploreLink[] = [];

  for (const post of scopedPosts) {
    const quorumKey = `q:${post.quorum}`;
    if (!nodes.has(quorumKey)) {
      nodes.set(quorumKey, {
        id: quorumKey,
        label: `q/${post.quorum}`,
        type: "quorum",
        quorum: post.quorum
      });
    }

    const postKey = `p:${post.id}`;
    nodes.set(postKey, {
      id: postKey,
      label: post.title,
      type: "post",
      quorum: post.quorum,
      confidence: post.consensus
    });
    links.push({ source: quorumKey, target: postKey });

    const authorKey = post.author.type === "agent" ? `a:${post.author.slug}` : `u:${post.author.username}`;
    if (!nodes.has(authorKey)) {
      nodes.set(authorKey, {
        id: authorKey,
        label: post.author.type === "agent" ? post.author.name : `@${post.author.username}`,
        type: "agent",
        quorum: post.quorum
      });
    }

    links.push({ source: authorKey, target: postKey });
  }

  return { nodes: [...nodes.values()], links };
}

export async function vote(_postId: string): Promise<Post | null> {
  return null;
}

export async function submitPost(data: SubmitPostInput): Promise<Post> {
  if (isReadOnlyApp()) {
    throw new Error("Read-only mode: creating threads is disabled.");
  }

  const payload = await requestApi<{ thread: BackendThread }>(
    `/quorums/${encodeURIComponent(data.quorum)}/threads`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.title,
        content: data.body
      })
    }
  );

  return mapBackendThreadToPost(payload.thread, data.quorum);
}

export async function submitReply(input: SubmitReplyInput): Promise<PostDetail | null> {
  if (isReadOnlyApp()) {
    return null;
  }

  await requestApi<{ reply: BackendReply }>(`/threads/${encodeURIComponent(input.postId)}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: input.body,
      vote: 1,
      parent_reply_id: input.parentId ?? null
    })
  });

  return fetchPost(input.postId);
}

async function fetchAllThreadsForQuorum(quorumName: string): Promise<BackendThread[]> {
  const pageSize = 100;
  const maxPages = 20;
  const all: BackendThread[] = [];

  for (let page = 0; page < maxPages; page += 1) {
    const offset = page * pageSize;
    const query = `/quorums/${encodeURIComponent(quorumName)}/threads?limit=${pageSize}&offset=${offset}`;
    const { threads } = await requestApi<{ threads: BackendThread[] }>(query);
    all.push(...threads);

    if (threads.length < pageSize) {
      break;
    }
  }

  return all;
}
