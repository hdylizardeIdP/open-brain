-- Enable extensions
create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- thoughts table
create table thoughts (
  id uuid primary key default gen_random_uuid(),
  raw_text text not null,
  embedding vector(1536) not null,
  embedding_model text not null,
  thread_id text,
  category text not null,
  category_source text not null default 'auto',
  people text[] not null default '{}',
  topics text[] not null default '{}',
  source text not null,
  slack_channel text,
  slack_ts text,
  created_at timestamptz not null default now()
);

-- action_items table
create table action_items (
  id uuid primary key default gen_random_uuid(),
  thought_id uuid not null references thoughts(id) on delete cascade,
  description text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- system_config table
create table system_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- Indexes: thoughts
create index thoughts_embedding_idx on thoughts
  using hnsw (embedding vector_cosine_ops);

create index thoughts_category_idx on thoughts
  using btree (category);

create index thoughts_created_at_idx on thoughts
  using btree (created_at);

create index thoughts_people_idx on thoughts
  using gin (people);

create index thoughts_topics_idx on thoughts
  using gin (topics);

-- Indexes: action_items
create index action_items_status_idx on action_items
  using btree (status);

create index action_items_thought_id_idx on action_items
  using btree (thought_id);

-- Transactional ingest: inserts thought + action items atomically
create or replace function ingest_thought(
  p_raw_text text,
  p_embedding vector(1536),
  p_embedding_model text,
  p_thread_id text,
  p_category text,
  p_category_source text,
  p_people text[],
  p_topics text[],
  p_source text,
  p_slack_channel text,
  p_slack_ts text,
  p_action_items text[] default '{}'
)
returns uuid
language plpgsql
as $$
declare
  thought_id uuid;
  item text;
begin
  insert into thoughts (
    raw_text, embedding, embedding_model, thread_id,
    category, category_source, people, topics,
    source, slack_channel, slack_ts
  ) values (
    p_raw_text, p_embedding, p_embedding_model, p_thread_id,
    p_category, p_category_source, p_people, p_topics,
    p_source, p_slack_channel, p_slack_ts
  ) returning id into thought_id;

  foreach item in array p_action_items loop
    insert into action_items (thought_id, description, status)
    values (thought_id, item, 'open');
  end loop;

  return thought_id;
end;
$$;

-- Vector similarity search function
create or replace function match_thoughts(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_category text default null,
  filter_after timestamptz default null,
  filter_before timestamptz default null,
  filter_people text[] default null
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
    and (filter_people is null or t.people && filter_people)
  order by t.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Seed system_config
insert into system_config (key, value) values
  ('embedding_model', 'text-embedding-3-small'),
  ('embedding_dimensions', '1536'),
  ('webhook_api_key', encode(gen_random_bytes(32), 'hex'));
