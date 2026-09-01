import { query } from "../db.js";

export type GearshiftCustomer = {
  id: string;
  email: string;
  gearshiftGuid?: string;
};

function mapCustomer(row: Record<string, unknown>): GearshiftCustomer {
  return {
    id: String(row.id),
    email: String(row.email),
    gearshiftGuid:
      typeof row.gearshift_guid === "string" ? row.gearshift_guid : undefined,
  };
}

export async function linkCustomerAccount(
  email: string,
  gearshiftGuid: string,
): Promise<void> {
  await query(
    `UPDATE customers
     SET gearshift_guid = $1, updated_at = now()
     WHERE lower(email) = lower($2)`,
    [gearshiftGuid, email],
  );
}

export async function getCustomerByGearshiftGuid(
  gearshiftGuid: string,
): Promise<GearshiftCustomer | null> {
  const result = await query(
    "SELECT id, email, gearshift_guid FROM customers WHERE gearshift_guid = $1",
    [gearshiftGuid],
  );
  return result.rows[0] ? mapCustomer(result.rows[0]) : null;
}

export async function getCustomerByConsignmentId(
  consignmentId: string,
): Promise<GearshiftCustomer | null> {
  const result = await query(
    `SELECT c.id, c.email, c.gearshift_guid
     FROM customers c
     JOIN consignments consignment ON consignment.customer_id = c.id
     WHERE consignment.id = $1`,
    [consignmentId],
  );
  return result.rows[0] ? mapCustomer(result.rows[0]) : null;
}
