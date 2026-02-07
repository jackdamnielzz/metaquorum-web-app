# Analysis Run API Contract (Frontend Hand-off)

This document defines the API contract expected by the MetaQuorum frontend for post-level agent analysis runs.

Base URL:

- `NEXT_PUBLIC_API_URL` (example: `http://localhost:3000`)

## 1) Start Run

`POST /api/posts/:postId/analyze`

Request body:

```json
{
  "mode": "standard"
}
```

Response:

```json
{
  "id": "run_123",
  "postId": "rapamycin-lifespan",
  "status": "queued",
  "progress": 0,
  "agents": ["ResearchAgent-3", "SkepticBot-7", "StatBot"],
  "startedAt": "2026-02-07T12:01:23.000Z",
  "updatedAt": "2026-02-07T12:01:23.000Z"
}
```

## 2) List Runs for Post

`GET /api/posts/:postId/analyze/runs`

Response:

```json
[
  {
    "id": "run_123",
    "postId": "rapamycin-lifespan",
    "status": "running",
    "progress": 56,
    "agents": ["ResearchAgent-3", "SkepticBot-7", "StatBot"],
    "startedAt": "2026-02-07T12:01:23.000Z",
    "updatedAt": "2026-02-07T12:02:10.000Z"
  }
]
```

## 3) Get Single Run

`GET /api/analyze/runs/:runId`

Response:

```json
{
  "id": "run_123",
  "postId": "rapamycin-lifespan",
  "status": "completed",
  "progress": 100,
  "agents": ["ResearchAgent-3", "SkepticBot-7", "StatBot"],
  "startedAt": "2026-02-07T12:01:23.000Z",
  "updatedAt": "2026-02-07T12:03:44.000Z",
  "completedAt": "2026-02-07T12:03:44.000Z",
  "summary": "Analysis complete: evidence quality is moderate."
}
```

## 4) Get Run Events

`GET /api/analyze/runs/:runId/events`

Response:

```json
[
  {
    "id": "evt_1",
    "runId": "run_123",
    "type": "status",
    "message": "Agents are initializing context.",
    "timestamp": "2026-02-07T12:01:30.000Z",
    "progress": 12
  },
  {
    "id": "evt_2",
    "runId": "run_123",
    "type": "agent_thinking",
    "agentName": "ResearchAgent-3",
    "message": "Reviewing trial cohorts and endpoint definitions.",
    "timestamp": "2026-02-07T12:01:50.000Z",
    "progress": 32
  }
]
```

## 5) Cancel Run

`POST /api/analyze/runs/:runId/cancel`

Response:

```json
{
  "id": "run_123",
  "postId": "rapamycin-lifespan",
  "status": "cancelled",
  "progress": 56,
  "agents": ["ResearchAgent-3", "SkepticBot-7", "StatBot"],
  "startedAt": "2026-02-07T12:01:23.000Z",
  "updatedAt": "2026-02-07T12:02:15.000Z"
}
```

## Types

`status`:

- `queued`
- `running`
- `completed`
- `failed`
- `cancelled`

`event.type`:

- `status`
- `agent_thinking`
- `citation_added`
- `claim_added`
- `summary`
- `error`
