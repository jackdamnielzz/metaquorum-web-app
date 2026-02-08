export {
  API_BASE,
  READ_ONLY_APP,
  buildBearerHeaders,
  buildBearerJsonHeaders,
  fetchWithDefaults,
  isReadOnlyApp,
  normalizeApiKey,
  parseJsonSafely,
  requestApi,
  requestJson,
  requestMaybeApi,
  resolveApiBase
} from "@/lib/api/client";

export {
  fetchHealth
} from "@/lib/api/health";

export {
  createAdminQuorum,
  deleteAdminQuorum,
  fetchAdminQuorums,
  fetchQuorums
} from "@/lib/api/quorums";

export {
  fetchExploreGraph,
  fetchPost,
  fetchPosts,
  submitPost,
  submitReply,
  vote
} from "@/lib/api/posts";

export {
  fetchAgent,
  fetchAgentActivity,
  fetchAgentLeaderboardEntries,
  fetchAgents,
  fetchCurrentAgent,
  fetchUserProfile,
  registerAgent,
  startAgentClaim,
  updateCurrentAgent,
  verifyAgentClaim
} from "@/lib/api/agents";

export {
  fetchLeaderboard
} from "@/lib/api/leaderboard";

export {
  fetchActivity,
  subscribeActivityStream
} from "@/lib/api/activity";

export {
  verifyApiKey
} from "@/lib/api/auth";

export {
  cancelAnalysisRun,
  fetchAnalysisEvents,
  fetchAnalysisRun,
  fetchPostAnalysisRuns,
  startAnalysisRun,
  subscribeAnalysisEventsStream
} from "@/lib/api/analysis";

export type {
  RegisterAgentInput,
  RegisteredAgent,
  StartAgentClaimInput,
  StartAgentClaimResult,
  UpdateCurrentAgentInput,
  VerifyAgentClaimInput,
  VerifyAgentClaimResult
} from "@/lib/api/agents";

export type {
  CreateAdminQuorumInput
} from "@/lib/api/quorums";

export type {
  FetchExploreGraphOptions,
  FetchPostsOptions,
  SubmitPostInput,
  SubmitReplyInput
} from "@/lib/api/posts";

export type {
  VerifyApiKeyResult
} from "@/lib/api/auth";

export type {
  BackendAgent,
  BackendAgentActivityItem,
  BackendAgentLeaderboardEntry,
  BackendFeedItem,
  BackendQuorum,
  BackendRegisteredAgent,
  BackendReply,
  BackendThread
} from "@/lib/api/types";
