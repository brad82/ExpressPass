import "dotenv/config";

export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name} for Gearshift worker startup.`,
    );
  }
  return value;
}

export function assertRequiredEnv(names: string[]): void {
  const missing = names.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `Missing required Gearshift worker environment variable${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}.`,
    );
  }
}
