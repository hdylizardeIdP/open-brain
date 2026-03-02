import type { ClassificationResult } from "./types.ts";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

const SYSTEM_PROMPT = `You are a metadata extraction engine for a personal knowledge system. Given a raw thought or note, extract structured metadata.

Return JSON with exactly these fields:
- "category": A short namespace string for this thought. Use lowercase, hyphenated values like "work", "personal", "health", "finance", "project-X" (replace X with project name). Pick the single most relevant category.
- "people": An array of person names mentioned or clearly implied. Use the form they appear in (e.g. "Sarah", "Dr. Kim"). Empty array if none.
- "topics": An array of key subjects or themes (1-5 items). Short lowercase phrases like "budget review", "api design", "hiring". Empty array if none relevant.
- "action_items": An array of action item strings extracted from the text. Each should be a concise imperative sentence (e.g. "Review Q3 budget by Friday"). Empty array if no tasks/commitments found.

Respond with ONLY valid JSON, no markdown fences, no explanation.`;

export async function classifyText(
  text: string,
): Promise<ClassificationResult> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not set");
  }

  const response = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(
      `OpenAI chat API error (${response.status}): ${err}`,
    );
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  const parsed = JSON.parse(content);

  return {
    category: parsed.category ?? "uncategorized",
    people: Array.isArray(parsed.people) ? parsed.people : [],
    topics: Array.isArray(parsed.topics) ? parsed.topics : [],
    action_items: Array.isArray(parsed.action_items)
      ? parsed.action_items
      : [],
  };
}
