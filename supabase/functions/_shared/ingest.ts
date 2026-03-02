import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { IngestRequest, Thought } from "./types.ts";
import { embedText } from "./embeddings.ts";
import { classifyText } from "./classify.ts";

export async function ingest(
  req: IngestRequest,
): Promise<Thought> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const embeddingModel = "text-embedding-3-small";
  const embeddingDimensions = 1536;

  // Run embed and classify in parallel
  const [embedding, classification] = await Promise.all([
    embedText(req.text, embeddingModel, embeddingDimensions),
    classifyText(req.text),
  ]);

  // Manual metadata overrides auto-classification
  const meta = req.metadata ?? {};
  const categorySource = meta.category ? "manual" : "auto";
  const category = meta.category ?? classification.category;
  const people = meta.people ?? classification.people;
  const topics = meta.topics ?? classification.topics;

  // Insert thought
  const thoughtRow = {
    raw_text: req.text,
    embedding: JSON.stringify(embedding),
    embedding_model: embeddingModel,
    thread_id: meta.thread_id ?? null,
    category,
    category_source: categorySource,
    people,
    topics,
    source: req.source,
    slack_channel: meta.slack_channel ?? null,
    slack_ts: meta.slack_ts ?? null,
  };

  const { data: thought, error: thoughtError } = await supabase
    .from("thoughts")
    .insert(thoughtRow)
    .select()
    .single();

  if (thoughtError) {
    throw new Error(`Failed to insert thought: ${thoughtError.message}`);
  }

  // Insert action items if any were extracted
  const actionItems = classification.action_items;
  if (actionItems.length > 0) {
    const actionRows = actionItems.map((description) => ({
      thought_id: thought.id,
      description,
      status: "open",
    }));

    const { error: actionError } = await supabase
      .from("action_items")
      .insert(actionRows);

    if (actionError) {
      throw new Error(
        `Thought created but action items failed: ${actionError.message}`,
      );
    }
  }

  return thought as Thought;
}
