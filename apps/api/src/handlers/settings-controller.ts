import type { FastifyInstance, FastifyRequest } from "fastify";
import type {
  BusinessInformation,
  IdentityProfile,
  NotificationPreferences,
} from "@expresspass/shared";
import {
  updateNotificationPreferences,
  withIdentityProfile,
} from "../repositories/customers.js";
import { identityProfileProvider } from "../services/identity-profile-provider.js";
import { BaseController } from "./base-controller.js";

type UpdateProfileRequest = FastifyRequest<{ Body: IdentityProfile }>;
type UpdateBusinessInformationRequest = FastifyRequest<{
  Body: BusinessInformation;
}>;
type UpdateNotificationPreferencesRequest = FastifyRequest<{
  Body: NotificationPreferences;
}>;

export class SettingsController extends BaseController {
  constructor(app: FastifyInstance) {
    super(app);
  }

  getMe = async (request: FastifyRequest) => {
    return withIdentityProfile(
      request.customer,
      await identityProfileProvider.getProfile(request.authUser),
    );
  };

  updateProfile = async (request: UpdateProfileRequest) => {
    return withIdentityProfile(
      request.customer,
      await identityProfileProvider.updateProfile(request.authUser, request.body),
    );
  };

  updateBusinessInformation = async (
    request: UpdateBusinessInformationRequest,
  ) => {
    return withIdentityProfile(
      request.customer,
      await identityProfileProvider.updateProfile(
        request.authUser,
        request.body,
      ),
    );
  };

  updateNotificationPreferences = async (
    request: UpdateNotificationPreferencesRequest,
  ) => {
    return withIdentityProfile(
      await updateNotificationPreferences(request.customer, request.body),
      await identityProfileProvider.getProfile(request.authUser),
    );
  };
}
