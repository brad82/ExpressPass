import { z } from "zod";

export const itemTypeSchema = z.object({
  id: z.number().int().positive(),
  description: z.string().min(1),
  shortName: z.string().min(1),
  taxable1: z.boolean(),
  taxable2: z.boolean(),
});

export type ItemType = z.infer<typeof itemTypeSchema>;

export const itemTypes: ItemType[] = [
  {
    id: 1,
    description: "Alpine Skis",
    shortName: "SKI",
    taxable1: true,
    taxable2: false,
  },
  {
    id: 2,
    description: "Snowboard",
    shortName: "SNBD",
    taxable1: true,
    taxable2: false,
  },
  {
    id: 3,
    description: "Boots",
    shortName: "BOOT",
    taxable1: true,
    taxable2: false,
  },
  {
    id: 4,
    description: "Poles",
    shortName: "POLE",
    taxable1: true,
    taxable2: false,
  },
  {
    id: 5,
    description: "Helmet",
    shortName: "HELM",
    taxable1: true,
    taxable2: false,
  },
  {
    id: 6,
    description: "Jacket",
    shortName: "JKT",
    taxable1: true,
    taxable2: false,
  },
  {
    id: 7,
    description: "Pants",
    shortName: "PANT",
    taxable1: true,
    taxable2: false,
  },
  {
    id: 8,
    description: "Accessory",
    shortName: "ACC",
    taxable1: true,
    taxable2: false,
  },
];

export function findItemType(id: number): ItemType | undefined {
  return itemTypes.find((itemType) => itemType.id === id);
}
