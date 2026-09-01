import { z } from "zod";

export const uuidV7Schema = z
  .string()
  .uuid()
  .refine((value) => value[14] === "7", "Expected a UUIDv7 id");

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

function hex(byte: number): string {
  return byte.toString(16).padStart(2, "0");
}

export function createUuidV7(date = new Date()): string {
  const timestamp = date.getTime();
  if (!Number.isSafeInteger(timestamp) || timestamp < 0) {
    throw new Error("UUIDv7 timestamp must be a non-negative safe integer");
  }

  const bytes = randomBytes(16);
  let remainingTimestamp = timestamp;
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = remainingTimestamp & 0xff;
    remainingTimestamp = Math.floor(remainingTimestamp / 256);
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const value = Array.from(bytes, hex).join("");
  return [
    value.slice(0, 8),
    value.slice(8, 12),
    value.slice(12, 16),
    value.slice(16, 20),
    value.slice(20),
  ].join("-");
}

export function isUuidV7(value: string): boolean {
  return uuidV7Schema.safeParse(value).success;
}

// The last 12 hex characters of a UUIDv7 are its fully random bits (the earlier segments
// carry the timestamp plus fixed version/variant nibbles) — short enough to print as a
// scannable consignment-reference barcode, distinct in shape from Gearshift's own
// `000-0000` item barcodes. At sale volumes in the low thousands, collision risk is
// negligible (~48 bits of randomness).
export function consignmentReferenceCode(id: string): string {
  return id.replace(/-/g, "").slice(-12).toUpperCase();
}
