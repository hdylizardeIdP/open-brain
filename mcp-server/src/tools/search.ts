import OpenAI from "openai";
import { supabase } from "../db.js";
import type { SearchResult } from "../types.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface SearchParams {
  query: string;
  category?: string;
  people?: string[];
  after?: string;
  before?: string;
  limit?: number;
}

export async function searchThoughts(
  params: SearchParams
): Promise<SearchResult[]> {
  const { query, category, people, after, before, limit = 10 } = params;

  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });

  const embedding = embeddingResponse.data[0].embedding;

  const { data, error } = await supabase.rpc("match_thoughts", {
    query_embedding: embedding,
    match_threshold: 0.3,
    match_count: limit,
    filter_category: category ?? null,
    filter_after: after ?? null,
    filter_before: before ?? null,
    filter_people: people ?? null,
  });

  if (error) {
    throw new Error(`Search failed: ${error.message}`);
  }

  return (data as SearchResult[]) ?? [];
}
