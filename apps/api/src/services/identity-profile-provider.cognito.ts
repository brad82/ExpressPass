import {
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import type { IdentityProfile } from "@expresspass/shared";
import type { AuthUser } from "../plugins/auth.js";
import { config } from "../config/index.js";
import {
  mergeIdentityProfile,
  parseIdentityProfilePatch,
  profileFromProvider,
  profileToProvider,
  readVendorCodes,
  type IdentityProfilePatch,
  type ProfileFieldMapping,
} from "./identity-profile-mapper.js";
import type { IdentityProfileProvider } from "./identity-profile-provider.js";

const cognitoProfileMap = [
  {
    profileKey: "firstName",
    providerPath: "given_name",
    defaultValue: (authUser: AuthUser) => authUser.firstName,
  },
  {
    profileKey: "lastName",
    providerPath: "family_name",
    defaultValue: (authUser: AuthUser) => authUser.lastName,
  },
  {
    profileKey: "email",
    providerPath: "email",
    defaultValue: (authUser: AuthUser) => authUser.email,
  },
  {
    profileKey: "phone",
    providerPath: "phone_number",
    omitWrite: (profile: IdentityProfile) => !profile.phone,
  },
  {
    profileKey: "address",
    providerPath: "address",
    read: (value: unknown) =>
      typeof value === "string" ? JSON.parse(value) : value,
    write: (profile: IdentityProfile) => JSON.stringify(profile.address),
  },
  {
    profileKey: "businessName",
    providerPath: "custom:business_name",
    write: (profile: IdentityProfile) => profile.businessName ?? "",
  },
  {
    profileKey: "gstNumber",
    providerPath: "custom:gst_number",
    write: (profile: IdentityProfile) => profile.gstNumber ?? "",
  },
  {
    profileKey: "vendorCodes",
    providerPath: "custom:vendor_codes",
    read: readVendorCodes,
    write: (profile: IdentityProfile) =>
      profile.vendorCodes?.length ? profile.vendorCodes.join(",") : "",
  },
] satisfies ProfileFieldMapping[];

export function cognitoAttributesToProfile(
  authUser: AuthUser,
  attributes: Record<string, string | undefined>,
): IdentityProfile {
  return profileFromProvider(authUser, attributes, cognitoProfileMap);
}

export function profileToCognitoAttributes(
  profile: IdentityProfile,
): Array<{ Name: string; Value: string }> {
  return Object.entries(profileToProvider(profile, cognitoProfileMap)).map(
    ([Name, Value]) => ({
      Name,
      Value: String(Value),
    }),
  );
}

export class CognitoIdentityProfileProvider implements IdentityProfileProvider {
  private readonly client = new CognitoIdentityProviderClient({
    region: config.awsRegion,
  });

  async getProfile(authUser: AuthUser): Promise<IdentityProfile> {
    if (!config.cognitoUserPoolId) {
      throw new Error(
        "COGNITO_USER_POOL_ID is required for Cognito profile reads",
      );
    }
    const response = await this.client.send(
      new AdminGetUserCommand({
        UserPoolId: config.cognitoUserPoolId,
        Username: authUser.subject,
      }),
    );
    const attributes = Object.fromEntries(
      (response.UserAttributes ?? []).map((attribute) => [
        attribute.Name ?? "",
        attribute.Value,
      ]),
    );
    return cognitoAttributesToProfile(authUser, attributes);
  }

  async updateProfile(
    authUser: AuthUser,
    patch: IdentityProfilePatch,
  ): Promise<IdentityProfile> {
    if (!config.cognitoUserPoolId) {
      throw new Error(
        "COGNITO_USER_POOL_ID is required for Cognito profile updates",
      );
    }
    const current = await this.getProfile(authUser);
    const profile = mergeIdentityProfile(
      authUser,
      current,
      parseIdentityProfilePatch(patch),
    );
    await this.client.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: config.cognitoUserPoolId,
        Username: authUser.subject,
        UserAttributes: profileToCognitoAttributes(profile),
      }),
    );
    return profile;
  }
}
