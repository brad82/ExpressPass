import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { NotificationsController } from "../handlers/notifications-controller.js";
import { idParamsSchema } from "./schemas.js";

export const notificationRoutes: FastifyPluginAsyncZod = async (app) => {
  const notifications = new NotificationsController(app);

  app.addHook("preHandler", app.requireCustomer);

  app.get("/notifications", notifications.list);
  app.post(
    "/notifications/:id/read",
    {
      schema: {
        params: idParamsSchema,
      },
    },
    notifications.markRead,
  );
};

