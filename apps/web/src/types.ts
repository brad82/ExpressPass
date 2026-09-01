import type {
  Consignment,
  ConsignmentItem,
  Customer,
  ItemType,
} from "@expresspass/shared";
import type { NotificationRow } from "./api";

export type PortalPageProps = {
  customer: Customer;
  consignments: Consignment[];
  itemTypes: ItemType[];
  equipmentManufacturers: string[];
  notifications: NotificationRow[];
  unread: number;
  latestConsignment?: Consignment;
};

export const emptyItem: ConsignmentItem = {
  barcode: "",
  description: "",
  itemType: 1,
  itemSize: "",
  priceCents: 100,
  new: false,
  redTag: false,
  qty: 1,
};
