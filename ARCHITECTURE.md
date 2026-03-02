# Open Brain — Architecture Specification

## Overview

A database-backed, agent-readable personal knowledge system that provides persistent semantic memory across multiple AI platforms (Claude, ChatGPT, Cursor, etc.) using the Model Context Protocol (MCP).

**Stack**: PostgreSQL + pgvector (Supabase) / TypeScript Edge Functions / TypeScript MCP Server

**Target cost**: ~$0.30/month (Supabase free tier, Slack free tier, minimal API costs)

---

## Data Model

### `thoughts`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Default `gen_random_uuid()` |
| `raw_text` | text | Original input |
| `embedding` | vector(1536) | From `text-embedding-3-small` |
| `embedding_model` | text | Model that generated the vector |
| `thread_id` | text (nullable) | Groups related thoughts (Slack `thread_ts` or caller-supplied) |
| `category` | text | Namespace: "work", "personal", "project-X", etc. |
| `category_source` | text | `'auto'` or `'manual'` |
| `people` | text[] | Extracted or supplied names |
| `topics` | text[] | Extracted or supplied topics |
| `source` | text | `'slack'`, `'cli'`, `'api'`, `'mcp'` |
| `slack_channel` | text (nullable) | Slack channel ID if applicable |
| `slack_ts` | text (nullable) | Slack message timestamp if applicable |
| `created_at` | timestamptz | Default `now()` |

### `action_items`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid (PK) | Default `gen_random_uuid()` |
| `thought_id` | uuid (FK → thoughts) | Parent thought |
| `description` | text | The action item |
| `status` | text | `'open'`, `'done'`, or `'tabled'` |
| `created_at` | timestamptz | Default `now()` |
| `updated_at` | timestamptz | Default `now()` |

### `system_config`

| Column | Type | Notes |
|---|---|---|
| `key` | text (PK) | Config key |
| `value` | text | Config value |
| `updated_at` | timestamptz | Default `now()` |

Initial rows:
- `('embedding_model', 'text-embedding-3-small')`
- `('embedding_dimensions', '1536')`
- `('webhook_api_key', '<generated-secret>')`

### Indexes

- `thoughts.embedding` — ivfflat or hnsw index for vector similarity search
- `thoughts.category` — btree for filtered queries
- `thoughts.created_at` — btree for recency queries
- `thoughts.people` — gin for array containment queries
- `thoughts.topics` — gin for array containment queries
- `action_items.status` — btree for status filtering
- `action_items.thought_id` — btree for FK lookups

---

## Capture Pipeline

### Architecture

```
Slack /think command ──→ /slack-ingest (adapter) ──→ ┐
                                                     ├──→ Core Ingest Logic
Generic POST           ──→ /ingest (authenticated) ──→ ┘
                                                     │
                                                     ├── 1. Embed text (OpenAI)
                                                     ├── 2. Classify metadata (LLM)
                                                     │     → category, people, topics, action items
                                                     └── 3. Write to PostgreSQL
```

### Edge Functions (Supabase, TypeScript)

#### `POST /ingest` — Generic Webhook

Request:
```json
{
  "text": "Need to review Q3 budget with Sarah by Friday",
  "source": "cli",
  "metadata": {
    "category": "work",
    "thread_id": "abc123"
  }
}
```

- `text` — required
- `source` — required
- `metadata` — optional; if fields are provided, they override auto-classification and set `category_source: 'manual'`
- Auth: `Authorization: Bearer <webhook_api_key>` validated against `system_config`

#### `POST /slack-ingest` — Slack Slash Command Adapter

- Receives Slack's slash command payload
- Validates request via Slack signing secret
- Extracts text, channel, thread_ts
- Acknowledges Slack immediately (< 3 second requirement)
- Processes async via `EdgeRuntime.waitUntil()`
- Calls core ingest logic with `source: 'slack'`

#### Core Ingest Logic (shared)

Runs two tasks in parallel:
1. **Embed**: Call OpenAI `text-embedding-3-small` → 1536-dim vector
2. **Classify**: Single LLM call (e.g., `gpt-4o-mini`) extracts:
   - `category` (unless manually supplied)
   - `people` (names mentioned or implied)
   - `topics` (key subjects)
   - `action_items` (any tasks/commitments found)

Then writes `thoughts` row + any `action_items` rows in a single transaction.

### Embedding Model

- **Model**: OpenAI `text-embedding-3-small`
- **Dimensions**: 1536
- **Cost**: $0.02 per 1M tokens (~$0.01-0.05/month at expected volume)
- **Vendor lock-in note**: Switching models requires re-embedding all existing thoughts. The `embedding_model` column on each row and `system_config` table track which model is active.

---

## MCP Server

### Hosting

- **Mode**: Local, stdio
- Launched as a subprocess by each AI client (Claude Desktop, Cursor, Claude Code)
- Connects to Supabase PostgreSQL using service role key from local `.env`
- No network auth needed (local process)

### Language

TypeScript — same as Edge Functions, shares types and utilities.

### Tools

| Tool | Description | Phase |
|---|---|---|
| `search` | Semantic search: embeds query, finds nearest thoughts by cosine similarity. Supports optional filters (category, people, date range). Returns top N results with scores. | 1 |
| `list_recent` | Returns last N thoughts. Optional filters: category, source, date range. | 1 |
| `add_thought` | Write a thought via MCP. Calls the ingest webhook internally. Lets agents capture on your behalf. | 1 |
| `get_action_items` | List action items filtered by status (`open`, `done`, `tabled`). Optional: filter by category, date range. | 2 |
| `update_action_item` | Change action item status (open → done, open → tabled, etc.). | 2 |
| `update_thought` | Modify a thought's category, people, topics. Sets `category_source: 'manual'`. | 2 |
| `stats` | Aggregate queries: thought count by time period, top topics, top people, action item completion rate, activity trends. | 3 |

---

## Auth & Security

| Boundary | Method |
|---|---|
| Generic webhook (`/ingest`) | Bearer token checked against `system_config.webhook_api_key` |
| Slack webhook (`/slack-ingest`) | Slack signing secret verification |
| MCP server → Supabase | Service role key in local `.env` |
| MCP server ← AI client | Local stdio, no network auth |

Single-user system. No RLS, no user table.

---

## Phased Implementation

### Phase 1 — MVP

Get a working brain: capture thoughts, search them.

- [ ] PostgreSQL schema + pgvector setup on Supabase
- [ ] `system_config` seeded with initial values
- [ ] Edge Function: core ingest logic (embed + classify)
- [ ] Edge Function: `/ingest` endpoint with Bearer auth
- [ ] Edge Function: `/slack-ingest` adapter with Slack signing verification
- [ ] MCP server: `search` tool (semantic similarity)
- [ ] MCP server: `list_recent` tool
- [ ] MCP server: `add_thought` tool
- [ ] Connect MCP server to one AI client (Claude Code or Claude Desktop)

### Phase 2 — Action Items & Write-back

Full lifecycle management.

- [ ] Action item extraction in ingest pipeline
- [ ] MCP tool: `get_action_items`
- [ ] MCP tool: `update_action_item`
- [ ] MCP tool: `update_thought`
- [ ] Category override flow (manual/agent adjustment)

### Phase 3 — Polish

Observability, tooling, portability.

- [ ] MCP tool: `stats`
- [ ] CLI capture tool (calls generic webhook)
- [ ] Integration guides: Claude Desktop, Cursor, Claude Code
- [ ] Re-embedding utility (for future model migration)

---

## Project Structure (planned)

```
open_brain/
├── supabase/
│   ├── migrations/          # SQL schema, indexes, seed data
│   └── functions/
│       ├── _shared/         # Shared types, ingest logic, embedding client
│       ├── ingest/          # Generic webhook endpoint
│       └── slack-ingest/    # Slack slash command adapter
├── mcp-server/
│   ├── src/
│   │   ├── index.ts         # MCP server entry point
│   │   ├── tools/           # Tool implementations
│   │   ├── db.ts            # Supabase/PostgreSQL client
│   │   └── types.ts         # Shared types
│   ├── package.json
│   └── tsconfig.json
├── ARCHITECTURE.md
└── README.md
```
