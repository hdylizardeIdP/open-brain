export interface Thought {
  id: string;
  raw_text: string;
  embedding: number[] | null;
  embedding_model: string | null;
  thread_id: string | null;
  category: string;
  category_source: string;
  people: string[];
  topics: string[];
  source: string;
  slack_channel: string | null;
  slack_ts: string | null;
  created_at: string;
}

export interface ActionItem {
  id: string;
  thought_id: string;
  description: string;
  status: "open" | "done" | "tabled";
  created_at: string;
  updated_at: string;
}

export interface SystemConfig {
  key: string;
  value: string;
  updated_at: string;
}

export interface SearchResult extends Omit<Thought, "embedding"> {
  similarity: number;
}
