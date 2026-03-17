import { supabase } from "../db.js";
import type { Thought } from "../types.js";

interface UpdateThoughtParams {
  id: string;
  category?: string;
  people?: string[];
  topics?: string[];
}

export async function updateThought(
  params: UpdateThoughtParams
): Promise<Omit<Thought, "embedding">> {
  const { id, category, people, topics } = params;

  const updates: Record<string, unknown> = {};
  if (category !== undefined) {
    updates.category = category;
    updates.category_source = "manual";
  }
  if (people !== undefined) {
    updates.people = people;
  }
  if (topics !== undefined) {
    updates.topics = topics;
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("At least one field (category, people, or topics) must be provided");
  }

  const { data, error } = await supabase
    .from("thoughts")
    .update(updates)
    .eq("id", id)
    .select(
      "id, raw_text, embedding_model, thread_id, category, category_source, people, topics, source, slack_channel, slack_ts, created_at"
    )
    .single();

  if (error) {
    const msg = error.code === "PGRST116"
      ? `Thought ${id} not found`
      : `Update thought failed: ${error.message}`;
    throw new Error(msg);
  }

  return data as Omit<Thought, "embedding">;
}
