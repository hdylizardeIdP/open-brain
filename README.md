# Open Brain

Personal memory infrastructure for AI agents. Capture thoughts from Slack or any API client, store them with semantic embeddings, and query them from any MCP-compatible AI platform.

## How It Works

1. **Capture** — Send a thought via Slack slash command (`/think`) or generic webhook
2. **Process** — Supabase Edge Function embeds the text and auto-classifies metadata (category, people, topics, action items)
3. **Query** — Any AI agent connects via MCP to search, list, and manage your thoughts

## Stack

- **Database**: PostgreSQL + pgvector on Supabase
- **Processing**: Supabase Edge Functions (TypeScript)
- **Embeddings**: OpenAI `text-embedding-3-small` (1536 dims)
- **Access**: MCP server (TypeScript, local stdio)

## MCP Tools

| Tool | Description |
|---|---|
| `search` | Semantic similarity search across thoughts |
| `list_recent` | Browse recent thoughts with optional filters |
| `add_thought` | Capture a thought through the agent |
| `get_action_items` | List action items by status |
| `update_action_item` | Mark items as open/done/tabled |
| `update_thought` | Edit category, people, topics |
| `stats` | Activity trends, top topics, completion rates |

## Setup

### Prerequisites

- [Supabase](https://supabase.com) account (free tier)
- [OpenAI](https://platform.openai.com) API key (for embeddings)
- [Slack](https://slack.com) workspace (for slash command capture)
- Node.js 20+

### 1. Database

```bash
supabase db push
```

Runs migrations in `supabase/migrations/` to create the schema, pgvector extension, and indexes.

### 2. Edge Functions

```bash
# Set secrets
supabase secrets set OPENAI_API_KEY=<your-key>
supabase secrets set SLACK_SIGNING_SECRET=<your-secret>

# Deploy
supabase functions deploy ingest
supabase functions deploy slack-ingest
```

### 3. MCP Server

```bash
cd mcp-server
npm install
cp .env.example .env  # Add your Supabase connection string
npm run build
```

### 4. Connect to AI Client

Add to your Claude Desktop / Cursor / Claude Code MCP config:

```json
{
  "mcpServers": {
    "open-brain": {
      "command": "node",
      "args": ["/path/to/open_brain/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

## Project Structure

```
open_brain/
├── supabase/
│   ├── migrations/          # SQL schema + indexes
│   └── functions/
│       ├── _shared/         # Shared ingest logic, types
│       ├── ingest/          # Generic webhook
│       └── slack-ingest/    # Slack adapter
├── mcp-server/
│   └── src/
│       ├── index.ts         # MCP server entry
│       ├── tools/           # Tool implementations
│       └── db.ts            # Database client
├── ARCHITECTURE.md          # Full architecture spec
└── README.md
```

## Cost

Running on free tiers with minimal API usage: ~$0.30/month.

| Component | Cost |
|---|---|
| Supabase (DB + Edge Functions) | Free tier |
| Slack | Free tier |
| OpenAI embeddings | ~$0.01-0.05/mo |
| LLM classification (gpt-4o-mini) | ~$0.10-0.20/mo |

## License

MIT
