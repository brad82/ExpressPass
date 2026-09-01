import { afterEach, describe, expect, it } from "vitest";
import { assertRequiredEnv, requiredEnv } from "./env.js";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Gearshift worker environment validation", () => {
  it("throws a helpful error for missing required variables", () => {
    delete process.env.GEARSHIFT_QUEUE;
    process.env.RABBITMQ_URL = "amqp://localhost:5672";

    expect(() =>
      assertRequiredEnv(["RABBITMQ_URL", "GEARSHIFT_QUEUE"]),
    ).toThrow(
      "Missing required Gearshift worker environment variable: GEARSHIFT_QUEUE.",
    );
  });

  it("returns trimmed required values", () => {
    process.env.GEARSHIFT_QUEUE = " gearshift.customer-events ";

    expect(requiredEnv("GEARSHIFT_QUEUE")).toBe("gearshift.customer-events");
  });
});
