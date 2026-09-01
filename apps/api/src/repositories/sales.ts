import { query } from "../db.js";

export async function getActiveSaleId(): Promise<string> {
  const result = await query<{ id: string }>(
    "SELECT id FROM sales WHERE status = 'active' LIMIT 1",
  );
  const saleId = result.rows[0]?.id;
  if (!saleId) {
    throw new Error("No sale is currently open for submissions");
  }
  return saleId;
}
