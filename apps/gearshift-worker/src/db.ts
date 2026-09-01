import pg from "pg";
import { requiredEnv } from "./env.js";

export const pool = new pg.Pool({
  connectionString: requiredEnv("DATABASE_URL"),
});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, values);
}

export async function closeDb(): Promise<void> {
  await pool.end();
}
