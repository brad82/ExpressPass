import type { ConsignmentStatus } from "@expresspass/shared";

export const friendlyConsignmentStatus: Record<ConsignmentStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  received: "Received",
  rejected: "Rejected",
};

export function shortConsignmentId(id: string): string {
  return id.slice(0, 8);
}
