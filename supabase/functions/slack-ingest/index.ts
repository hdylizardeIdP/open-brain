import { ingest } from "../_shared/ingest.ts";

async function verifySlackSignature(
  req: Request,
  body: string,
): Promise<boolean> {
  const signingSecret = Deno.env.get("SLACK_SIGNING_SECRET");
  if (!signingSecret) {
    throw new Error("SLACK_SIGNING_SECRET not set");
  }

  const timestamp = req.headers.get("X-Slack-Request-Timestamp");
  const slackSignature = req.headers.get("X-Slack-Signature");

  if (!timestamp || !slackSignature) {
    return false;
  }

  // Reject requests older than 5 minutes to prevent replay attacks
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    return false;
  }

  const sigBasestring = `v0:${timestamp}:${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(sigBasestring),
  );
  const hex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const computed = `v0=${hex}`;

  // Constant-time comparison
  if (computed.length !== slackSignature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i++) {
    mismatch |= computed.charCodeAt(i) ^ slackSignature.charCodeAt(i);
  }
  return mismatch === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Read raw body for signature verification
  const rawBody = await req.text();

  // Verify Slack signing secret
  const valid = await verifySlackSignature(req, rawBody);
  if (!valid) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse application/x-www-form-urlencoded payload
  const params = new URLSearchParams(rawBody);
  const text = params.get("text") ?? "";
  const channelId = params.get("channel_id") ?? "";
  const channelName = params.get("channel_name") ?? "";

  if (!text.trim()) {
    return new Response("Usage: /think <your thought here>", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Acknowledge Slack immediately, then process async
  const promise = ingest({
    text,
    source: "slack",
    metadata: {
      slack_channel: channelId,
      slack_ts: params.get("trigger_id") ?? undefined,
    },
  }).catch((err) => {
    console.error(
      `Async slack ingest failed for channel ${channelName}:`,
      err,
    );
  });

  // Use EdgeRuntime.waitUntil to keep processing after response
  // @ts-ignore: EdgeRuntime is available in Supabase Edge Functions
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(promise);
  }

  return new Response("Got it, processing your thought...", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
});
