import { supabase } from "../db.js";
import type { ActionItemWithThought } from "../types.js";

interface GetActionItemsParams {
  status?: "open" | "done" | "tabled";
  category?: string;
  after?: string;
  before?: string;
  limit?: number;
}

export async function getActionItems(
  params: GetActionItemsParams
): Promise<ActionItemWithThought[]> {
  const { status, category, after, before, limit = 20 } = params;

  let query = supabase
    .from("action_items")
    .select(
      "id, thought_id, description, status, created_at, updated_at, thoughts!inner(id, raw_text, category, category_source, people, topics)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }
  if (category) {
    query = query.eq("thoughts.category", category);
  }
  if (after) {
    query = query.gte("created_at", after);
  }
  if (before) {
    query = query.lte("created_at", before);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Get action items failed: ${error.message}`);
  }

  return (
    (data ?? []).map((row: any) => {
      const { thoughts, ...item } = row;
      return { ...item, thought: thoughts };
    }) as ActionItemWithThought[]
  );
}
