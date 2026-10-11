# Shop Assistant MCP Server

A self-hosted MCP (Model Context Protocol) server built for the **Alexa+** track of the
Amazon Build, Ship, Shape Developer Hackathon.

It gives a small shop owner voice/chat-driven tools to track stock, record sales,
and draft supplier reorders, with data that persists between sessions.

## What it does

The server exposes six tools over Streamable HTTP (MCP spec `2025-11-25`):

| Tool | What it does |
|---|---|
| `ping` | Confirms the server is running |
| `add_stock` | Adds stock for an item, creating it if new |
| `record_sale` | Records a sale and reduces stock |
| `check_stock` | Reports how many units of an item are left |
| `list_low_stock` | Lists items at or below their reorder level |
| `draft_reorder` | Drafts a ready-to-send supplier order for everything low on stock |

Stock and sales data is saved to a local JSON file (`data/shop.json`), so it
survives server restarts.

## Tech stack

- Node.js + TypeScript
- [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) (Streamable HTTP transport)
- Express
- Zod (tool input validation)

## Setup

1. Install dependencies: