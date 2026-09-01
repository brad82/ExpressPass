import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  encodeGearshiftMessage,
  gearshiftContentType,
  type GearshiftMessage,
} from "@expresspass/shared";
import { processGearshiftDelivery, processGearshiftMessage } from "./broker.js";
import { dispatchGearshiftMessage } from "./handlers/index.js";
import { recordIntegrationMessage } from "./repositories/integrations.js";

vi.mock("./handlers/index.js", () => ({
  dispatchGearshiftMessage: vi.fn(),
}));

vi.mock("./repositories/integrations.js", () => ({
  recordIntegrationMessage: vi.fn(),
}));

const message: GearshiftMessage = {
  messageId: "m1",
  type: "remote_account_linked",
  schemaVersion: 1,
  sourceSystem: "gearshift",
  occurredAt: "2026-05-07T10:00:00.000Z",
  publishedAt: "2026-05-07T10:00:01.000Z",
  remoteAccountNumber: "A-100",
  email: "customer@example.com",
  gearshiftGuid: "gearshift-vendor-1",
  linkedAt: "2026-05-07T10:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(recordIntegrationMessage).mockResolvedValue(true);
});

describe("Gearshift broker", () => {
  it("decodes, records, and dispatches valid protobuf deliveries", async () => {
    await processGearshiftDelivery({
      content: encodeGearshiftMessage(message),
      properties: { contentType: gearshiftContentType },
    });

    expect(recordIntegrationMessage).toHaveBeenCalledWith(
      "m1",
      "remote_account_linked",
      expect.objectContaining(message),
    );
    expect(dispatchGearshiftMessage).toHaveBeenCalledWith(
      expect.objectContaining(message),
    );
  });

  it("rejects wrong content types", async () => {
    await expect(
      processGearshiftDelivery({
        content: encodeGearshiftMessage(message),
        properties: { contentType: "application/json" },
      }),
    ).rejects.toThrow("Unsupported Gearshift content type");
  });

  it("rejects invalid protobuf bytes", async () => {
    await expect(
      processGearshiftDelivery({
        content: new Uint8Array([255, 255, 255]),
        properties: { contentType: gearshiftContentType },
      }),
    ).rejects.toThrow();
  });

  it("does not dispatch duplicate message IDs", async () => {
    vi.mocked(recordIntegrationMessage).mockResolvedValue(false);

    await expect(processGearshiftMessage(message)).resolves.toBe(false);

    expect(dispatchGearshiftMessage).not.toHaveBeenCalled();
  });
});
