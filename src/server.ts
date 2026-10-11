import express from "express";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { addStock, recordSale, getItem, listLowStock } from "./store.js";

const text = (t: string) => ({
  content: [{ type: "text" as const, text: t }],
});
const fail = (t: string) => ({
  isError: true,
  content: [{ type: "text" as const, text: t }],
});

function createServer() {
  const server = new McpServer({ name: "shop-assistant", version: "1.0.0" });

  server.registerTool(
    "ping",
    { description: "Check that the shop assistant is running" },
    async () => text("Shop assistant is running.")
  );

  server.registerTool(
    "add_stock",
    {
      description: "Add stock for an item, creating the item if it is new",
      inputSchema: {
        name: z.string().describe("Item name"),
        quantity: z.number().positive().describe("Units to add"),
        price: z.number().nonnegative().optional().describe("Selling price per unit"),
        reorder_level: z.number().nonnegative().optional().describe("Flag as low stock at or below this number"),
      },
    },
    async ({ name, quantity, price, reorder_level }) => {
      const item = addStock(name, quantity, price, reorder_level);
      return text(
        `${item.name}: ${item.quantity} in stock at ${item.price} each. Reorder level ${item.reorderLevel}.`
      );
    }
  );

  server.registerTool(
    "record_sale",
    {
      description: "Record a sale and reduce stock",
      inputSchema: {
        name: z.string().describe("Item name"),
        quantity: z.number().positive().describe("Units sold"),
        price: z.number().nonnegative().optional().describe("Price per unit if different from the usual price"),
      },
    },
    async ({ name, quantity, price }) => {
      try {
        const { item, total } = recordSale(name, quantity, price);
        return text(`Sold ${quantity} ${item.name} for ${total}. ${item.quantity} left.`);
      } catch (e) {
        return fail((e as Error).message);
      }
    }
  );

  server.registerTool(
    "check_stock",
    {
      description: "Check how many units of an item are left",
      inputSchema: { name: z.string().describe("Item name") },
    },
    async ({ name }) => {
      const item = getItem(name);
      if (!item) return fail(`No stock record for "${name}".`);
      return text(`${item.name}: ${item.quantity} left at ${item.price} each.`);
    }
  );

  server.registerTool(
    "list_low_stock",
    { description: "List items at or below their reorder level" },
    async () => {
      const low = listLowStock();
      if (low.length === 0) return text("All items are above their reorder level.");
      return text(
        low.map((i) => `${i.name}: ${i.quantity} left (reorder at ${i.reorderLevel})`).join("\n")
      );
    }
  );

  server.registerTool(
    "draft_reorder",
    { description: "Draft a supplier order message for all low-stock items" },
    async () => {
      const low = listLowStock();
      if (low.length === 0) return text("Nothing needs reordering.");
      const lines = low.map(
        (i) => `- ${i.name}: ${Math.max(i.reorderLevel * 3 - i.quantity, 1)} units (${i.quantity} left)`
      );
      return text(
        `Hello, I would like to place an order:\n${lines.join("\n")}\nPlease confirm availability and price. Thank you.`
      );
    }
  );

  return server;
}

const app = express();
app.use(express.json());

app.post("/mcp", async (req, res) => {
   const origin = req.headers.origin;
    if (origin && !["http://127.0.0.1:3000", "http://localhost:3000", "https://maker-void-overvalue.ngrok-free.dev"].includes(origin)) {
    res.status(403).json({ error: "Forbidden: bad Origin" });
    return;
  }
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.listen(3000, "127.0.0.1", () => {
  console.log("Shop assistant MCP server: http://127.0.0.1:3000/mcp");
});