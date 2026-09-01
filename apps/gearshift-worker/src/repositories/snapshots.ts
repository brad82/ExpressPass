import type { GearshiftItemSnapshot, ItemNote } from "@expresspass/shared";
import { query } from "../db.js";

// The stored `payload` is the item snapshot itself (not the ItemUpdated envelope):
// `getConsignmentStatus` returns it verbatim as a GearshiftItemSnapshot, and
// `appendItemNote` mutates `payload->'notes'` in place.
export async function upsertItemSnapshot(
  gearshiftGuid: string,
  item: GearshiftItemSnapshot,
): Promise<void> {
  const payload = item;
  await query(
    `INSERT INTO gearshift_item_snapshots
     (id, gearshift_guid, consignment_id, item_id, barcode, description, item_type, item_type_name,
      item_size, price_cents, qty, qty_checked, qty_sold, reclaimed, value_sold_cents, time_sold, payload, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, now())
     ON CONFLICT (id) DO UPDATE
     SET gearshift_guid = EXCLUDED.gearshift_guid,
         consignment_id = EXCLUDED.consignment_id,
         item_id = EXCLUDED.item_id,
         barcode = EXCLUDED.barcode,
         description = EXCLUDED.description,
         item_type = EXCLUDED.item_type,
         item_type_name = EXCLUDED.item_type_name,
         item_size = EXCLUDED.item_size,
         price_cents = EXCLUDED.price_cents,
         qty = EXCLUDED.qty,
         qty_checked = EXCLUDED.qty_checked,
         qty_sold = EXCLUDED.qty_sold,
         reclaimed = EXCLUDED.reclaimed,
         value_sold_cents = EXCLUDED.value_sold_cents,
         time_sold = EXCLUDED.time_sold,
         payload = EXCLUDED.payload,
         updated_at = now()`,
    [
      item.id,
      gearshiftGuid,
      item.consignmentId ?? null,
      item.itemId ?? null,
      item.barcode ?? null,
      item.description,
      item.itemType,
      item.itemTypeName ?? null,
      item.itemSize,
      item.priceCents,
      item.qty,
      item.qtyChecked,
      item.qtySold,
      item.reclaimed,
      item.valueSoldCents,
      item.timeSold,
      payload,
    ],
  );

  await query("DELETE FROM gearshift_item_notes WHERE item_snapshot_id = $1", [
    item.id,
  ]);
  for (const note of item.notes) {
    await appendItemNote(item.id, {
      ...note,
      id: note.id ?? `${item.id}:${note.createdAt}:${note.text}`,
    });
  }
}

// Current stored price for an item, or null when no snapshot row exists yet. Used by
// the item_updated handler to decide whether to record a `price_updated` history event.
export async function getItemSnapshotPriceCents(
  gearshiftItemId: string,
): Promise<number | null> {
  const result = await query<{ price_cents: string | number }>(
    "SELECT price_cents FROM gearshift_item_snapshots WHERE id = $1",
    [gearshiftItemId],
  );
  if (result.rows.length === 0) {
    return null;
  }
  return Number(result.rows[0].price_cents);
}

export async function upsertItemLink(
  gearshiftItemId: string,
  consignmentId: string,
  itemId: string | null,
  gearshiftGuid?: string,
): Promise<void> {
  await query(
    `INSERT INTO gearshift_item_links
       (gearshift_item_id, consignment_id, item_id, gearshift_guid, updated_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (gearshift_item_id) DO UPDATE
     SET consignment_id = EXCLUDED.consignment_id,
         item_id = COALESCE(EXCLUDED.item_id, gearshift_item_links.item_id),
         gearshift_guid = COALESCE(EXCLUDED.gearshift_guid, gearshift_item_links.gearshift_guid),
         updated_at = now()`,
    [gearshiftItemId, consignmentId, itemId, gearshiftGuid ?? null],
  );
}

export async function appendItemNote(
  gearshiftItemId: string,
  note: ItemNote & { id: string },
): Promise<void> {
  await query(
    `INSERT INTO gearshift_item_notes (id, item_snapshot_id, note_text, note_type, created_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO NOTHING`,
    [note.id, gearshiftItemId, note.text, note.type ?? null, note.createdAt],
  );
  await query(
    `UPDATE gearshift_item_snapshots
     SET payload = jsonb_set(
           payload,
           '{notes}',
           COALESCE(payload->'notes', '[]'::jsonb) || $2::jsonb,
           true
         ),
         updated_at = now()
     WHERE id = $1`,
    [gearshiftItemId, JSON.stringify(note)],
  );
}
