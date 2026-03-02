interface AddThoughtParams {
  text: string;
  category?: string;
  thread_id?: string;
}

interface IngestResponse {
  id?: string;
  error?: string;
}

export async function addThought(
  params: AddThoughtParams
): Promise<IngestResponse> {
  const webhookUrl = process.env.INGEST_WEBHOOK_URL;
  const apiKey = process.env.WEBHOOK_API_KEY;

  if (!webhookUrl || !apiKey) {
    throw new Error(
      "Missing INGEST_WEBHOOK_URL or WEBHOOK_API_KEY environment variables"
    );
  }

  const body: Record<string, unknown> = {
    text: params.text,
    source: "mcp",
  };

  if (params.category || params.thread_id) {
    body.metadata = {
      ...(params.category && { category: params.category }),
      ...(params.thread_id && { thread_id: params.thread_id }),
    };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ingest webhook failed (${response.status}): ${text}`);
  }

  return (await response.json()) as IngestResponse;
}
