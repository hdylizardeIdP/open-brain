import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { IngestRequest } from "./types.ts";
import { embedText } from "./embeddings.ts";
import { classifyText } from "./classify.ts";

export async function ingest(
  req: IngestRequest,
): Promise<{ id: string }> {
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

  // Atomic insert: thought + action items in a single transaction via RPC
  const { data: thoughtId, error } = await supabase.rpc("ingest_thought", {
    p_raw_text: req.text,
    p_embedding: JSON.stringify(embedding),
    p_embedding_model: embeddingModel,
    p_thread_id: meta.thread_id ?? null,
    p_category: category,
    p_category_source: categorySource,
    p_people: people,
    p_topics: topics,
    p_source: req.source,
    p_slack_channel: meta.slack_channel ?? null,
    p_slack_ts: meta.slack_ts ?? null,
    p_action_items: classification.action_items,
  });

  if (error) {
    throw new Error(`Failed to ingest thought: ${error.message}`);
  }

  return { id: thoughtId as string };
}
