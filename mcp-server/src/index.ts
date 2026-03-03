import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { searchThoughts } from "./tools/search.js";
import { listRecentThoughts } from "./tools/list-recent.js";
import { addThought } from "./tools/add-thought.js";

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
      .optional()
      .describe("Only return thoughts after this ISO 8601 date"),
    before: z
      .string()
      .optional()
      .describe("Only return thoughts before this ISO 8601 date"),
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
      .optional()
      .describe("Only return thoughts after this ISO 8601 date"),
    before: z
      .string()
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
