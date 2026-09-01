import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { ConsignmentsController } from "../handlers/consignments-controller.js";
import {
  idParamsSchema,
  itemHistoryParamsSchema,
  replaceConsignmentItemsBodySchema,
} from "./schemas.js";

export const consignmentRoutes: FastifyPluginAsyncZod = async (app) => {
  const consignments = new ConsignmentsController(app);

  app.addHook("preHandler", app.requireCustomer);

  app.get("/consignments", consignments.list);
  app.post("/consignments", consignments.create);
  app.get(
    "/consignments/:id/status",
    {
      schema: {
        params: idParamsSchema,
      },
    },
    consignments.status,
  );
  app.get(
    "/consignments/:id/status/:gearshiftItemId/history",
    {
      schema: {
        params: itemHistoryParamsSchema,
      },
    },
    consignments.itemHistory,
  );
  app.patch(
    "/consignments/:id",
    {
      schema: {
        params: idParamsSchema,
        body: replaceConsignmentItemsBodySchema,
      },
    },
    consignments.replaceItems,
  );
  app.post(
    "/consignments/:id/submit",
    {
      schema: {
        params: idParamsSchema,
      },
    },
    consignments.submit,
  );
  app.get("/payouts", consignments.payouts);
};
