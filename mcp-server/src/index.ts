import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { searchThoughts } from "./tools/search.js";
import { listRecentThoughts } from "./tools/list-recent.js";
import { addThought } from "./tools/add-thought.js";
import { getActionItems } from "./tools/get-action-items.js";
import { updateActionItem } from "./tools/update-action-item.js";
import { updateThought } from "./tools/update-thought.js";

const server = new McpServer({
  name: "open-brain",
  version: "1.0.0",
});

server.tool(
  "search",
  "Semantic search over stored thoughts. Embeds the query and finds nearest matches by cosine similarity.",
  {
    query: z.string().describe("Natural language search query"),
    category: z
      .string()
      .optional()
      .describe("Filter by category (e.g. 'work', 'personal')"),
    people: z
      .array(z.string())
      .optional()
      .describe("Filter by people mentioned (e.g. ['Sarah', 'Dr. Kim'])"),
    after: z
      .string()
      .datetime()
      .optional()
      .describe("Only return thoughts after this ISO 8601 datetime (e.g. 2026-03-05T13:45:00Z)"),
    before: z
      .string()
      .datetime()
      .optional()
      .describe("Only return thoughts before this ISO 8601 datetime (e.g. 2026-03-05T13:45:00Z)"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe("Max number of results (default 10)"),
  },
  async ({ query, category, people, after, before, limit }) => {
    try {
      const results = await searchThoughts({
        query,
        category,
        people,
        after,
        before,
        limit,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
  }
);

server.tool(
  "list_recent",
  "List recent thoughts ordered by creation time (newest first).",
  {
    category: z
      .string()
      .optional()
      .describe("Filter by category (e.g. 'work', 'personal')"),
    source: z
      .string()
      .optional()
      .describe("Filter by source (e.g. 'slack', 'cli', 'api', 'mcp')"),
    after: z
      .string()
      .datetime()
      .optional()
      .describe("Only return thoughts after this ISO 8601 date"),
    before: z
      .string()
      .datetime()
      .optional()
      .describe("Only return thoughts before this ISO 8601 date"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Max number of results (default 20)"),
  },
  async ({ category, source, after, before, limit }) => {
    try {
      const results = await listRecentThoughts({ category, source, after, before, limit });
      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
  }
);

server.tool(
  "add_thought",
  "Capture a new thought. Sends it to the ingest pipeline for embedding and classification.",
  {
    text: z.string().describe("The thought text to capture"),
    category: z
      .string()
      .optional()
      .describe(
        "Manual category override (e.g. 'work', 'personal'). If omitted, auto-classified."
      ),
    thread_id: z
      .string()
      .optional()
      .describe("Thread ID to group related thoughts together"),
  },
  async ({ text, category, thread_id }) => {
    try {
      const result = await addThought({ text, category, thread_id });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
  }
);

server.tool(
  "get_action_items",
  "Query action items extracted from thoughts. Returns items with parent thought metadata.",
  {
    status: z
      .enum(["open", "done", "tabled"])
      .optional()
      .describe("Filter by status"),
    category: z
      .string()
      .optional()
      .describe("Filter by parent thought's category"),
    after: z
      .string()
      .datetime()
      .optional()
      .describe("Only return items created after this ISO 8601 date"),
    before: z
      .string()
      .datetime()
      .optional()
      .describe("Only return items created before this ISO 8601 date"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Max number of results (default 20)"),
  },
  async ({ status, category, after, before, limit }) => {
    try {
      const results = await getActionItems({ status, category, after, before, limit });
      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
  }
);

server.tool(
  "update_action_item",
  "Update an action item's status (open, done, or tabled).",
  {
    id: z.string().uuid().describe("Action item UUID"),
    status: z.enum(["open", "done", "tabled"]).describe("New status"),
  },
  async ({ id, status }) => {
    try {
      const result = await updateActionItem({ id, status });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
  }
);

server.tool(
  "update_thought",
  "Edit a thought's category, people, and/or topics. Sets category_source to 'manual' when category is changed.",
  {
    id: z.string().uuid().describe("Thought UUID"),
    category: z.string().optional().describe("New category"),
    people: z.array(z.string()).optional().describe("New people list"),
    topics: z.array(z.string()).optional().describe("New topics list"),
  },
  async ({ id, category, people, topics }) => {
    try {
      const result = await updateThought({ id, category, people, topics });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
