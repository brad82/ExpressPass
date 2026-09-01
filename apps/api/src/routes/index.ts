import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { catalogRoutes } from "./catalog-routes.js";
import { consignmentRoutes } from "./consignment-routes.js";
import { notificationRoutes } from "./notification-routes.js";
import { settingsRoutes } from "./settings-routes.js";

export const routesPlugin: FastifyPluginAsyncZod = async (app) => {
  app.get("/health", async () => ({ ok: true }));

  await app.register(settingsRoutes);
  await app.register(notificationRoutes);
  await app.register(catalogRoutes);
  await app.register(consignmentRoutes);
};

