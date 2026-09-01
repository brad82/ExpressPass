import { requiredEnv } from "./env.js";

export type OidcConfig = {
  oidcIssuer: string;
  oidcJwksUrl: string;
  oidcAudience: string;
};

export function oidcConfig(): OidcConfig {
  return {
    oidcIssuer: requiredEnv("OIDC_ISSUER"),
    oidcJwksUrl: requiredEnv("OIDC_JWKS_URL"),
    oidcAudience: requiredEnv("OIDC_AUDIENCE"),
  };
}
