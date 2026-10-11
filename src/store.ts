import fs from "node:fs";
import path from "node:path";

export type Item = {
  name: string;
  quantity: number;
  price: number;
  reorderLevel: number;
};

export type Sale = {
  item: string;
  quantity: number;
  total: number;
  at: string;
};

type Data = { items: Record<string, Item>; sales: Sale[] };

const FILE = path.join(process.cwd(), "data", "shop.json");

function load(): Data {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return { items: {}, sales: [] };
  }
}

function save(data: Data) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

const key = (name: string) => name.trim().toLowerCase();

export function addStock(
  name: string,
  quantity: number,
  price?: number,
  reorderLevel?: number
): Item {
  const data = load();
  const existing = data.items[key(name)];
  const item: Item = {
    name: existing?.name ?? name.trim(),
    quantity: (existing?.quantity ?? 0) + quantity,
    price: price ?? existing?.price ?? 0,
    reorderLevel: reorderLevel ?? existing?.reorderLevel ?? 5,
  };
  data.items[key(name)] = item;
  save(data);
  return item;
}

export function recordSale(
  name: string,
  quantity: number,
  price?: number
): { item: Item; total: number } {
  const data = load();
  const item = data.items[key(name)];
  if (!item) throw new Error(`No stock record for "${name}".`);
  if (item.quantity < quantity) {
    throw new Error(`Only ${item.quantity} ${item.name} left, cannot sell ${quantity}.`);
  }
  const total = (price ?? item.price) * quantity;
  item.quantity -= quantity;
  data.sales.push({ item: item.name, quantity, total, at: new Date().toISOString() });
  save(data);
  return { item, total };
}

export function getItem(name: string): Item | undefined {
  return load().items[key(name)];
}

export function listLowStock(): Item[] {
  return Object.values(load().items).filter((i) => i.quantity <= i.reorderLevel);
}