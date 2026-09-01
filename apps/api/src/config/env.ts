export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function requiredIntEnv(name: string): number {
  const raw = requiredEnv(name);
  const value = Number(raw);
  if (!Number.isInteger(value)) {
    throw new Error(`Environment variable ${name} must be an integer.`);
  }
  return value;
}

export function requiredCsvEnv(name: string): string[] {
  const values = requiredEnv(name)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (values.length === 0) {
    throw new Error(
      `Environment variable ${name} must contain at least one value.`,
    );
  }
  return values;
}

export function requiredBoolEnv(name: string): boolean {
  const value = requiredEnv(name);
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  throw new Error(`Environment variable ${name} must be either true or false.`);
}
