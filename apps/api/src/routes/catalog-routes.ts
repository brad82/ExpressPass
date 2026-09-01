import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { CatalogController } from "../handlers/catalog-controller.js";
import { pricingGuideParamsSchema } from "./schemas.js";

export const catalogRoutes: FastifyPluginAsyncZod = async (app) => {
  const catalog = new CatalogController(app);

  app.addHook("preHandler", app.requireAuth);

  app.get("/catalog/item-types", catalog.listItemTypes);
  app.get(
    "/catalog/equipment-manufacturers",
    catalog.listEquipmentManufacturers,
  );
  app.get(
    "/catalog/pricing-guides/:itemType",
    {
      schema: {
        params: pricingGuideParamsSchema,
      },
    },
    catalog.getPricingGuide,
  );
};
