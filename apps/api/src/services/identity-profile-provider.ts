import type { IdentityProfile } from "@expresspass/shared";
import type { AuthUser } from "../plugins/auth.js";
import { config } from "../config/index.js";
import type { IdentityProfilePatch } from "./identity-profile-mapper.js";
import { AuthentikIdentityProfileProvider } from "./identity-profile-provider.authentik.js";
import { CognitoIdentityProfileProvider } from "./identity-profile-provider.cognito.js";

export type { IdentityProfilePatch } from "./identity-profile-mapper.js";

export type IdentityProfileProvider = {
  getProfile(authUser: AuthUser): Promise<IdentityProfile>;
  updateProfile(
    authUser: AuthUser,
    patch: IdentityProfilePatch,
  ): Promise<IdentityProfile>;
};

export function createIdentityProfileProvider(): IdentityProfileProvider {
  if (config.identityProvider === "cognito") {
    return new CognitoIdentityProfileProvider();
  }
  if (config.identityProvider === "authentik") {
    return new AuthentikIdentityProfileProvider();
  }
  throw new Error("IDENTITY_PROVIDER must be either 'authentik' or 'cognito'");
}

export const identityProfileProvider = createIdentityProfileProvider();
