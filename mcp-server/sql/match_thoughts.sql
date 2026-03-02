-- Supabase database function for vector similarity search.
-- Run this in the Supabase SQL editor or add to migrations.

create or replace function match_thoughts(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_category text default null,
  filter_after timestamptz default null,
  filter_before timestamptz default null
)
returns table (
  id uuid,
  raw_text text,
  embedding_model text,
  thread_id text,
  category text,
  category_source text,
  people text[],
  topics text[],
  source text,
  slack_channel text,
  slack_ts text,
  created_at timestamptz,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    t.id,
    t.raw_text,
    t.embedding_model,
    t.thread_id,
    t.category,
    t.category_source,
    t.people,
    t.topics,
    t.source,
    t.slack_channel,
    t.slack_ts,
    t.created_at,
    1 - (t.embedding <=> query_embedding) as similarity
  from thoughts t
  where 1 - (t.embedding <=> query_embedding) > match_threshold
    and (filter_category is null or t.category = filter_category)
    and (filter_after is null or t.created_at >= filter_after)
    and (filter_before is null or t.created_at <= filter_before)
  order by t.embedding <=> query_embedding
  limit match_count;
end;
$$;
