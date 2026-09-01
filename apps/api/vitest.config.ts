import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      NODE_ENV: "test",
      PORT: "4000",
      HOST: "0.0.0.0",
      DATABASE_URL: "postgres://consign:consign@localhost:5432/consignments",
      WEB_ORIGIN: "http://localhost:3000",
      OIDC_ISSUER: "http://auth.localhost/application/o/expresspass/",
      OIDC_JWKS_URL: "http://auth.localhost/application/o/expresspass/jwks/",
      OIDC_AUDIENCE: "expresspass",
      IDENTITY_PROVIDER: "authentik",
      AUTHENTIK_BASE_URL: "http://auth.localhost",
      AUTHENTIK_TOKEN: "authentik-dev-token",
      AWS_REGION: "garage",
      S3_ENDPOINT: "http://localhost:3900",
      S3_FORCE_PATH_STYLE: "true",
      AWS_ACCESS_KEY_ID: "GK111111111111111111111111",
      AWS_SECRET_ACCESS_KEY:
        "1111111111111111111111111111111111111111111111111111111111111111",
      S3_CONSIGNMENT_BUCKET: "local-consignments",
    },
  },
  resolve: {
    alias: {
      "@expresspass/shared": fileURLToPath(
        new URL("../../packages/shared/src/index.ts", import.meta.url),
      ),
    },
  },
});
