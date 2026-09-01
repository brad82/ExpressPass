import { beforeEach, describe, expect, it, vi } from "vitest";
import { markConsignmentReceived } from "./consignments.js";
import { query } from "../db.js";

vi.mock("../db.js", () => ({
  query: vi.fn(),
}));

const mockedQuery = vi.mocked(query);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("markConsignmentReceived", () => {
  it("only advances consignments that are currently submitted", async () => {
    mockedQuery.mockResolvedValue({
      rows: [{ customer_id: "customer-1" }],
      rowCount: 1,
    } as never);

    const customerId = await markConsignmentReceived(
      "0196a5ca-e000-7000-8000-000000000001",
      "2026-05-07T10:00:00.000Z",
      "gearshift-vendor-1",
    );

    expect(customerId).toBe("customer-1");
    const [sql, params] = mockedQuery.mock.calls[0];
    expect(sql).toContain("status = 'received'");
    expect(sql).toContain("status = 'submitted'");
    expect(params).toEqual([
      "2026-05-07T10:00:00.000Z",
      "gearshift-vendor-1",
      "0196a5ca-e000-7000-8000-000000000001",
    ]);
  });

  it("returns null when nothing was in submitted state", async () => {
    mockedQuery.mockResolvedValue({ rows: [], rowCount: 0 } as never);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const customerId = await markConsignmentReceived(
      "0196a5ca-e000-7000-8000-000000000001",
      "2026-05-07T10:00:00.000Z",
      "gearshift-vendor-1",
    );

    expect(customerId).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
