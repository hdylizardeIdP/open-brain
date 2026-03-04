const OPENAI_API_URL = "https://api.openai.com/v1/embeddings";

export async function embedText(
  text: string,
  model = "text-embedding-3-small",
  dimensions = 1536,
): Promise<number[]> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not set");
  }

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: text,
      model,
      dimensions,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI embeddings API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.data[0].embedding as number[];
}
