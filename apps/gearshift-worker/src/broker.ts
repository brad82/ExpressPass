import {
  decodeGearshiftMessage,
  gearshiftContentType,
  type GearshiftMessage,
} from "@expresspass/shared";
import { dispatchGearshiftMessage } from "./handlers/index.js";
import { recordIntegrationMessage } from "./repositories/integrations.js";

export type GearshiftDelivery = {
  content: Uint8Array;
  properties: {
    contentType?: string;
  };
};

export async function processGearshiftMessage(
  message: GearshiftMessage,
): Promise<boolean> {
  const firstProcessing = await recordIntegrationMessage(
    message.messageId,
    message.type,
    message,
  );
  if (!firstProcessing) {
    return false;
  }

  await dispatchGearshiftMessage(message);
  return true;
}

export async function processGearshiftDelivery(
  delivery: GearshiftDelivery,
): Promise<boolean> {
  if (delivery.properties.contentType !== gearshiftContentType) {
    throw new Error(
      `Unsupported Gearshift content type: ${delivery.properties.contentType ?? "none"}`,
    );
  }

  const message = decodeGearshiftMessage(delivery.content);
  return processGearshiftMessage(message);
}
