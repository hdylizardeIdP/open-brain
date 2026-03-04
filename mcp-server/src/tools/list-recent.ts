import { supabase } from "../db.js";
import type { Thought } from "../types.js";

interface ListRecentParams {
  category?: string;
  source?: string;
  after?: string;
  before?: string;
  limit?: number;
}

export async function listRecentThoughts(
  params: ListRecentParams
): Promise<Omit<Thought, "embedding">[]> {
  const { category, source, after, before, limit = 20 } = params;

  let query = supabase
    .from("thoughts")
    .select(
      "id, raw_text, embedding_model, thread_id, category, category_source, people, topics, source, slack_channel, slack_ts, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (category) {
    query = query.eq("category", category);
  }
  if (source) {
    query = query.eq("source", source);
  }
  if (after) {
    query = query.gte("created_at", after);
  }
  if (before) {
    query = query.lte("created_at", before);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`List recent failed: ${error.message}`);
  }

  return (data as Omit<Thought, "embedding">[]) ?? [];
}
