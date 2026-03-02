export interface Thought {
  id: string;
  raw_text: string;
  embedding: number[];
  embedding_model: string;
  thread_id: string | null;
  category: string;
  category_source: "auto" | "manual";
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

export interface IngestRequest {
  text: string;
  source: string;
  metadata?: {
    category?: string;
    thread_id?: string;
    people?: string[];
    topics?: string[];
    slack_channel?: string;
    slack_ts?: string;
  };
}

export interface ClassificationResult {
  category: string;
  people: string[];
  topics: string[];
  action_items: string[];
}
