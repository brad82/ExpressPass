import {
  customerSchema,
  notificationPreferencesSchema,
  type Customer,
  type IdentityProfile,
  type NotificationPreferences,
  createUuidV7,
} from "@expresspass/shared";
import type { AuthUser } from "../plugins/auth.js";
import { pool, query } from "../db.js";

type IdentityClaims = Pick<
  AuthUser,
  "subject" | "email" | "firstName" | "lastName" | "role"
>;

function mapCustomer(
  row: Record<string, unknown>,
  identity?: Partial<IdentityClaims>,
): Customer {
  const legacyProfile =
    typeof row.profile === "object" && row.profile ? row.profile : {};
  const profile = {
    address: { line1: "", line2: "", city: "", province: "AB", postalCode: "" },
    ...legacyProfile,
    email: identity?.email ?? row.email,
    firstName: identity?.firstName ?? "",
    lastName: identity?.lastName ?? "",
  };
  return customerSchema.parse({
    id: row.id,
    oidcSubject: row.idp_subject,
    email: identity?.email ?? row.email,
    role: identity?.role ?? row.role,
    profile,
    profileLocked: row.profile_locked,
    gearshiftGuid: row.gearshift_guid ?? undefined,
    notificationPreferences: {
      emailOptIn: row.email_opt_in ?? false,
      smsOptIn: row.sms_opt_in ?? false,
      smsPhone: row.sms_phone ?? undefined,
      smsVerified: row.sms_verified ?? false,
    },
  });
}

export function withIdentityProfile(
  customer: Customer,
  profile: IdentityProfile,
): Customer {
  return customerSchema.parse({
    ...customer,
    email: profile.email,
    profile,
  });
}

export async function ensureCustomer(user: AuthUser): Promise<Customer> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      user.subject,
    ]);
    const existingSubject = await client.query(
      `UPDATE customers
       SET email = $2, role = $3, updated_at = now()
       WHERE idp_subject = $1`,
      [user.subject, user.email, user.role],
    );
    if (existingSubject.rowCount === 0) {
      await client.query(
        `INSERT INTO customers (id, idp_subject, email, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE
         SET idp_subject = EXCLUDED.idp_subject,
             role = EXCLUDED.role,
             updated_at = now()`,
        [createUuidV7(), user.subject, user.email, user.role],
      );
    }
    await client.query(
      `INSERT INTO notification_preferences (customer_id)
       SELECT id FROM customers WHERE idp_subject = $1
       ON CONFLICT (customer_id) DO NOTHING`,
      [user.subject],
    );
    const result = await client.query(
      `SELECT c.*, np.email_opt_in, np.sms_opt_in, np.sms_phone, np.sms_verified
       FROM customers c
       LEFT JOIN notification_preferences np ON np.customer_id = c.id
       WHERE c.idp_subject = $1`,
      [user.subject],
    );
    await client.query("COMMIT");
    if (!result.rows[0]) {
      throw new Error("Unable to create customer");
    }
    return mapCustomer(result.rows[0], user);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export async function getCustomerBySubject(
  subject: string,
  identity?: IdentityClaims,
): Promise<Customer | null> {
  const result = await query(
    `SELECT c.*, np.email_opt_in, np.sms_opt_in, np.sms_phone, np.sms_verified
     FROM customers c
     LEFT JOIN notification_preferences np ON np.customer_id = c.id
     WHERE c.idp_subject = $1`,
    [subject],
  );
  return result.rows[0] ? mapCustomer(result.rows[0], identity) : null;
}

export async function getCustomerById(
  id: string,
  identity?: Partial<IdentityClaims>,
): Promise<Customer | null> {
  const result = await query(
    `SELECT c.*, np.email_opt_in, np.sms_opt_in, np.sms_phone, np.sms_verified
     FROM customers c
     LEFT JOIN notification_preferences np ON np.customer_id = c.id
     WHERE c.id = $1`,
    [id],
  );
  return result.rows[0] ? mapCustomer(result.rows[0], identity) : null;
}

export async function getCustomerByEmail(
  email: string,
): Promise<Customer | null> {
  const result = await query(
    `SELECT c.*, np.email_opt_in, np.sms_opt_in, np.sms_phone, np.sms_verified
     FROM customers c
     LEFT JOIN notification_preferences np ON np.customer_id = c.id
     WHERE lower(c.email) = lower($1)`,
    [email],
  );
  return result.rows[0] ? mapCustomer(result.rows[0]) : null;
}

export async function getCustomerByGearshiftGuid(
  gearshiftGuid: string,
): Promise<Customer | null> {
  const result = await query(
    `SELECT c.*, np.email_opt_in, np.sms_opt_in, np.sms_phone, np.sms_verified
     FROM customers c
     LEFT JOIN notification_preferences np ON np.customer_id = c.id
     WHERE c.gearshift_guid = $1`,
    [gearshiftGuid],
  );
  return result.rows[0] ? mapCustomer(result.rows[0]) : null;
}

export async function updateNotificationPreferences(
  customer: Customer,
  preferences: NotificationPreferences,
): Promise<Customer> {
  const parsed = notificationPreferencesSchema.parse(preferences);
  await query(
    `INSERT INTO notification_preferences (customer_id, email_opt_in, sms_opt_in, sms_phone, sms_verified, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (customer_id) DO UPDATE
     SET email_opt_in = EXCLUDED.email_opt_in,
         sms_opt_in = EXCLUDED.sms_opt_in,
         sms_phone = EXCLUDED.sms_phone,
         sms_verified = EXCLUDED.sms_verified,
         updated_at = now()`,
    [
      customer.id,
      parsed.emailOptIn,
      parsed.smsOptIn,
      parsed.smsPhone ?? null,
      parsed.smsVerified,
    ],
  );
  const updatedCustomer = await getCustomerById(customer.id, customer);
  if (!updatedCustomer) {
    throw new Error("Customer not found");
  }
  return updatedCustomer;
}

export async function linkCustomerAccount(
  email: string,
  gearshiftGuid: string,
  _vendorId?: number,
): Promise<void> {
  void _vendorId;
  await query(
    `UPDATE customers
     SET gearshift_guid = $1, updated_at = now()
     WHERE lower(email) = lower($2)`,
    [gearshiftGuid, email],
  );
}

export async function lockProfile(customerId: string): Promise<void> {
  await query(
    "UPDATE customers SET profile_locked = true, updated_at = now() WHERE id = $1",
    [customerId],
  );
}
