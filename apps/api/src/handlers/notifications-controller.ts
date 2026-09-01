import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  listNotifications,
  markNotificationRead,
} from "../repositories/notifications.js";
import { BaseController } from "./base-controller.js";

type NotificationIdRoute = {
  Params: { id: string };
};

type NotificationIdRequest = FastifyRequest<NotificationIdRoute>;

export class NotificationsController extends BaseController {
  constructor(app: FastifyInstance) {
    super(app);
  }

  list = async (request: FastifyRequest) => {
    return listNotifications(request.customer.id);
  };

  markRead = async (request: NotificationIdRequest) => {
    await markNotificationRead(request.customer.id, request.params.id);
    return { ok: true };
  };
}
