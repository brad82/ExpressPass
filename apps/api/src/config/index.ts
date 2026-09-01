import "dotenv/config";

import { requiredCsvEnv, requiredEnv, requiredIntEnv } from "./env.js";
import { identityProviderConfig } from "./identity-provider.js";
import { oidcConfig } from "./oidc.js";
import { s3Config } from "./s3.js";

export const config = {
  nodeEnv: requiredEnv("NODE_ENV"),
  port: requiredIntEnv("PORT"),
  host: requiredEnv("HOST"),
  databaseUrl: requiredEnv("DATABASE_URL"),
  webOrigins: requiredCsvEnv("WEB_ORIGIN"),
  ...oidcConfig(),
  ...identityProviderConfig(),
  ...s3Config(),
};

export type Config = typeof config;
