import { requiredEnv } from "./env.js";

export type IdentityProvider = "authentik" | "cognito";

export type IdentityProviderConfig = {
  identityProvider: IdentityProvider;
  cognitoUserPoolId: string | undefined;
  authentikBaseUrl: string | undefined;
  authentikToken: string | undefined;
};

function resolveIdentityProvider(): IdentityProvider {
  const value = requiredEnv("IDENTITY_PROVIDER");
  if (value === "authentik" || value === "cognito") {
    return value;
  }
  throw new Error("IDENTITY_PROVIDER must be either 'authentik' or 'cognito'.");
}

export function identityProviderConfig(): IdentityProviderConfig {
  const provider = resolveIdentityProvider();
  const base = {
    identityProvider: provider,
    cognitoUserPoolId: undefined,
    authentikBaseUrl: undefined,
    authentikToken: undefined,
  };
  switch (provider) {
    case "cognito":
      return { ...base, cognitoUserPoolId: requiredEnv("COGNITO_USER_POOL_ID") };
    case "authentik":
      return {
        ...base,
        authentikBaseUrl: requiredEnv("AUTHENTIK_BASE_URL"),
        authentikToken: requiredEnv("AUTHENTIK_TOKEN"),
      };
  }
}
