import { supabase } from "../db.js";
import type { ActionItem } from "../types.js";

interface UpdateActionItemParams {
  id: string;
  status: "open" | "done" | "tabled";
}

export async function updateActionItem(
  params: UpdateActionItemParams
): Promise<ActionItem> {
  const { id, status } = params;

  const { data, error } = await supabase
    .from("action_items")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    const msg = error.code === "PGRST116"
      ? `Action item ${id} not found`
      : `Update action item failed: ${error.message}`;
    throw new Error(msg);
  }

  return data as ActionItem;
}
