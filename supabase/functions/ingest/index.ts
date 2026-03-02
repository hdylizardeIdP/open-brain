import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ingest } from "../_shared/ingest.ts";
import type { IngestRequest } from "../_shared/types.ts";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate Bearer token against system_config
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = authHeader.slice(7);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: config, error: configError } = await supabase
    .from("system_config")
    .select("value")
    .eq("key", "webhook_api_key")
    .single();

  if (configError || !config) {
    return new Response(JSON.stringify({ error: "Auth config unavailable" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (token !== config.value) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse and validate body
  let body: IngestRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.text || !body.source) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: text, source" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const thought = await ingest(body);
    return new Response(JSON.stringify(thought), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Ingest error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
