import pg from "pg";
import { config } from "./config/index.js";

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
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
