# Fix Intent: Phase 1 Review Findings

Consolidated from Codex review, Gemini review, and internal code review.

## B1 — Transactional Ingest

**Problem**: `_shared/ingest.ts` does two separate `.insert()` calls (thought, then action_items). If action_items insert fails, orphaned thought row persists. Spec requires single transaction.

**Fix**: Create a Postgres function `ingest_thought(...)` that accepts the thought fields + action item descriptions as a text array. Function does both inserts inside a single transaction block. Replace the two supabase `.insert()` calls in `ingest.ts` with a single `supabase.rpc('ingest_thought', ...)` call. Add the function to the migration file.

## B2 — Slack Timestamp Mapped to trigger_id

**Problem**: `slack-ingest/index.ts` maps `params.get("trigger_id")` to `slack_ts`. `trigger_id` is an ephemeral modal token, not a message timestamp. Slash commands don't include a real `message_ts`.

**Fix**: Use the `X-Slack-Request-Timestamp` header (unix epoch of when command was issued) as `slack_ts`. This is the most accurate timestamp available from a slash command payload. Remove `trigger_id` usage.

## M1 — Search Missing people Filter

**Problem**: Architecture spec says search supports optional `people` filter. Not implemented in MCP tool schema or `match_thoughts` RPC.

**Fix**: Add `filter_people text[] default null` param to `match_thoughts` function with `WHERE people && filter_people` (array overlap). Add `people` as optional `string[]` to MCP search tool Zod schema. Pass through to `searchThoughts()`.

## M2 — list_recent Missing Date Range

**Problem**: Architecture spec says list_recent supports optional date range. Not implemented.

**Fix**: Add `after` and `before` optional string params to MCP `list_recent` tool schema. Add `.gte('created_at', after)` / `.lte('created_at', before)` filters in `list-recent.ts`.

## M3 — Migration Missing pgcrypto Extension

**Problem**: `gen_random_bytes(32)` requires `pgcrypto`. Supabase pre-installs it, but migration should be explicit for portability.

**Fix**: Add `create extension if not exists pgcrypto with schema extensions;` before table definitions.

## L1 — Webhook Token Comparison Not Constant-Time

**Problem**: `ingest/index.ts` uses `token !== config.value` for Bearer token validation. Timing side-channel. The Slack adapter correctly uses constant-time comparison.

**Fix**: Replace string equality with HMAC-based constant-time comparison in `ingest/index.ts`, matching the pattern used in `slack-ingest/index.ts`.

## Deferred (not fixing now)

- **L2**: Embedding model/dimensions hardcoded vs read from system_config — works correctly, config-driven can come later.
- **L3**: No `import_map.json` for Deno imports — not required, just recommended.
