# Project Brief: Open Brain Personal Memory Infrastructure

## Objective
Build a database-backed, agent-readable personal knowledge system that allows for persistent, semantic memory across multiple AI platforms (Claude, ChatGPT, Cursor, etc.) using the Model Context Protocol (MCP).

## Core Architecture Components
1. **Storage Layer:** A **PostgreSQL database** utilizing the **PGVector** extension for storing mathematical representations (vector embeddings) of thoughts [7, 8].
2. **Capture Interface:** Integration with a messaging platform (e.g., **Slack**) to input raw text thoughts [8, 12].
3. **Processing Pipeline:** A **Supabase Edge Function** that performs two tasks in parallel upon receiving input:
    - Generates a **vector embedding** of the text for semantic search [8].
    - Extracts **metadata** (people involved, topics, action items, dates) [8, 12].
4. **Access Layer:** An **MCP Server** that connects the PostgreSQL database to any AI client, providing the following tools:
    - **Semantic Search:** Finding memories by meaning/context rather than keywords [8, 12].
    - **List Recent:** Browsing recent captures [8].
    - **Stats:** Visualizing patterns in captured data [8].

## Implementation Requirements
- **Data Ownership:** The infrastructure must be hosted by the user (e.g., via Supabase) to avoid SaaS lock-in [6, 10].
- **Protocol:** Must strictly adhere to the **Model Context Protocol (MCP)** standards to ensure universal compatibility with AI agents [7, 9].
- **Cost Efficiency:** Optimize for the free tiers of Slack and Supabase, targeting an operating cost of ~$0.30/month [10, 11].

## Workflow Instructions for the LLM
1. **Step 1: Database Setup.** Provide SQL scripts to initialize a PostgreSQL database with the PGVector extension and the necessary schema for storing raw text, embeddings, and metadata.
2. **Step 2: Capture Pipeline.** Generate code for a Supabase Edge Function that can receive a webhook from Slack, call an embedding model API, and save the result to the database.
3. **Step 3: MCP Server Development.** Architect a Node.js or Python-based MCP server that can query the PostgreSQL database and expose the search/retrieval tools to AI clients.
4. **Step 4: Integration Guides.** Provide instructions for connecting this MCP server to Claude Desktop, Cursor, and other compatible LLM interfaces.
--------------------------------------------------------------------------------
