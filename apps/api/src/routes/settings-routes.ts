import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import {
  type BusinessInformation,
  type IdentityProfile,
  type NotificationPreferences,
  businessInformationSchema,
  identityProfileSchema,
  notificationPreferencesSchema,
} from "@expresspass/shared";
import { SettingsController } from "../handlers/settings-controller.js";

export const settingsRoutes: FastifyPluginAsyncZod = async (app) => {
  const settings = new SettingsController(app);

  app.addHook("preHandler", app.requireCustomer);

  app.get("/me", settings.getMe);
  app.put<{ Body: IdentityProfile }>(
    "/me/profile",
    {
      schema: {
        body: identityProfileSchema,
      },
    },
    settings.updateProfile,
  );
  app.put<{ Body: BusinessInformation }>(
    "/me/business-information",
    {
      preHandler: app.requireRole("business", "Business information not found"),
      schema: {
        body: businessInformationSchema,
      },
    },
    settings.updateBusinessInformation,
  );
  app.put<{ Body: NotificationPreferences }>(
    "/me/notification-preferences",
    {
      schema: {
        body: notificationPreferencesSchema,
      },
    },
    settings.updateNotificationPreferences,
  );
};
