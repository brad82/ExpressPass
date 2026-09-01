import type { FastifyInstance, FastifyRequest } from "fastify";
import { itemTypes } from "@expresspass/shared";
import { skiEquipmentManufacturers } from "../catalog/equipment-manufacturers.js";
import { pricingGuideForItemType } from "../catalog/pricing-guides.js";

type PricingGuideRequest = FastifyRequest<{
  Params: { itemType: number };
}>;

export class CatalogController {
  constructor(private readonly app: FastifyInstance) {}

  listItemTypes = async () => itemTypes;

  listEquipmentManufacturers = async () => skiEquipmentManufacturers;

  getPricingGuide = async (request: PricingGuideRequest) => {
    return pricingGuideForItemType(request.params.itemType);
  };
}
