import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ConsignmentItem } from "@expresspass/shared";
import {
  createConsignment,
  getConsignment,
  listConsignments,
  replaceConsignmentItems,
  submitConsignment,
} from "../repositories/consignments.js";
import { withIdentityProfile } from "../repositories/customers.js";
import { listPayouts } from "../repositories/payouts.js";
import { getItemHistory } from "../repositories/item-events.js";
import { getConsignmentStatus } from "../repositories/snapshots.js";
import { identityProfileProvider } from "../services/identity-profile-provider.js";
import { writeConsignmentExport } from "../services/s3-exporter.js";
import { BaseController } from "./base-controller.js";

type ConsignmentIdRoute = {
  Params: { id: string };
};

type ReplaceConsignmentItemsRoute = ConsignmentIdRoute & {
  Body: ConsignmentItem[] | { items: ConsignmentItem[] };
};

type ItemHistoryRoute = {
  Params: { id: string; gearshiftItemId: string };
};

type ConsignmentIdRequest = FastifyRequest<ConsignmentIdRoute>;
type ItemHistoryRequest = FastifyRequest<ItemHistoryRoute>;
type ReplaceConsignmentItemsRequest =
  FastifyRequest<ReplaceConsignmentItemsRoute>;

export class ConsignmentsController extends BaseController {
  constructor(app: FastifyInstance) {
    super(app);
  }

  list = async (request: FastifyRequest) => {
    return listConsignments(request.customer.id);
  };

  create = async (request: FastifyRequest) => {
    return createConsignment(request.customer.id);
  };

  replaceItems = async (request: ReplaceConsignmentItemsRequest) => {
    const body = Array.isArray(request.body)
      ? request.body
      : request.body.items;
    return replaceConsignmentItems(request.customer, request.params.id, body);
  };

  submit = async (request: ConsignmentIdRequest) => {
    const payload = await submitConsignment(
      withIdentityProfile(
        request.customer,
        await identityProfileProvider.getProfile(request.authUser),
      ),
      request.params.id,
    );
    const s3Key = await writeConsignmentExport(payload);
    return {
      ...(await getConsignment(request.customer.id, request.params.id)),
      s3Key,
    };
  };

  status = async (request: ConsignmentIdRequest) => {
    const consignment = await getConsignment(
      request.customer.id,
      request.params.id,
    );
    if (!consignment) {
      throw this.app.httpErrors.notFound("Consignment not found");
    }
    return getConsignmentStatus(request.params.id);
  };

  itemHistory = async (request: ItemHistoryRequest) => {
    const consignment = await getConsignment(
      request.customer.id,
      request.params.id,
    );
    if (!consignment) {
      throw this.app.httpErrors.notFound("Consignment not found");
    }
    return getItemHistory(request.params.id, request.params.gearshiftItemId);
  };

  payouts = async (request: FastifyRequest) => {
    return listPayouts(request.customer.gearshiftGuid);
  };
}
