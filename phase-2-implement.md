# Phase 2: Action Items & Write-back — Implementation Summary

## What was done

Added 3 new MCP tools for action item lifecycle management and thought editing, plus configured the MCP server for Claude Code and Claude Desktop.

## Files created

### `mcp-server/src/tools/get-action-items.ts`
Queries `action_items` table with optional filters. Uses `!inner` join on `thoughts` so category filtering applies to the parent thought. Exposes the Supabase `thoughts` array on a `thought` field in the output (the data remains an array, only the field name changes).

**Params**: `status?` (open|done|tabled), `category?`, `after?`, `before?`, `limit?` (default 20)

### `mcp-server/src/tools/update-action-item.ts`
Updates an action item's status by UUID. Explicitly sets `updated_at` since no DB trigger exists. Uses `.single()` so a non-existent UUID returns a clear error.

**Params**: `id` (uuid), `status` (open|done|tabled)

### `mcp-server/src/tools/update-thought.ts`
Partial update of a thought's metadata. Builds update object from only the provided fields. Sets `category_source: 'manual'` only when `category` is changed. Validates at least one field is provided before hitting the DB. Returns full thought minus embedding.

**Params**: `id` (uuid), `category?`, `people?`, `topics?`

## Files modified

### `mcp-server/src/types.ts`
Added `ActionItemWithThought` interface — extends `ActionItem` with a `thought` field containing parent thought metadata (id, raw_text, category, people, topics).

### `mcp-server/src/index.ts`
- Added imports for all 3 new tool modules
- Registered `get_action_items`, `update_action_item`, `update_thought` via `server.tool()`
- Uses `z.enum(["open", "done", "tabled"])` for status fields
- Uses `z.string().uuid()` for ID fields (validates before DB call)
- Error handling follows existing pattern (try/catch, `isError: true`)

## MCP server configuration

### Claude Code (WSL) — `~/.claude/settings.json`
Added `open-brain` entry with `command: "node"`, pointing to `dist/index.js` with env vars inline.

### Claude Desktop (Windows) — `C:\Users\hdyli\AppData\Roaming\Claude\claude_desktop_config.json`
Added `open-brain` entry using `wsl.exe bash -c` pattern (matching existing servers like postgres, weather). Env vars passed inline in the bash command string. Uses full nvm node path (`/home/hdyli/.nvm/versions/node/v22.19.0/bin/node`).

### Claude Desktop (Mac) — manual setup required
Config file: `~/Library/Application Support/Claude/claude_desktop_config.json`. Same shape as WSL config but with `command: "node"` directly (no wsl.exe wrapper). Requires cloning repo and running `npm install && npm run build` on the Mac.

## Verification performed

| Test | Result |
|---|---|
| `npm run build` | Clean compilation, no errors |
| `get_action_items({})` — no filters | Returned all 5 action items across 3 thoughts |
| Ingested "both cars for oil change" thought | Extracted 2 action items: "Take both cars in for service", "Get oil change for each car" |
| Ingested "Norfolk water service" thought | Extracted 2 action items: "Change water service to my name", "Contact property manager about water service" |

## Verification remaining

| Test | How to verify |
|---|---|
| `get_action_items({ status: "open" })` | Should return only open items |
| `get_action_items({ category: "personal" })` | Should filter by parent thought category |
| `update_action_item({ id: "<uuid>", status: "done" })` | Should update status and `updated_at` |
| `update_action_item` with bad UUID | Should return error |
| `update_thought({ id: "<uuid>", category: "rental" })` | Should update category and set `category_source: "manual"` |
| `update_thought` with only `people` | Should not change `category_source` |

## Full tool inventory (after Phase 2)

| Tool | Purpose |
|---|---|
| `search` | Semantic search over thoughts (cosine similarity) |
| `list_recent` | List thoughts by creation time |
| `add_thought` | Ingest a new thought (embed + classify + extract actions) |
| `get_action_items` | Query action items with filters |
| `update_action_item` | Change action item status |
| `update_thought` | Edit thought metadata |
