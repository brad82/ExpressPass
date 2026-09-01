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

export type AuthentikUser = {
  pk?: number;
  uid?: string;
  username?: string;
  email?: string;
  name?: string;
  attributes?: Record<string, unknown>;
};

type AuthentikUserList = {
  results?: AuthentikUser[];
};

const authentikProfileMap = [
  {
    profileKey: "firstName",
    providerPath: ["attributes", "firstName"],
    defaultValue: (authUser: AuthUser) => authUser.firstName,
  },
  {
    profileKey: "lastName",
    providerPath: ["attributes", "lastName"],
    defaultValue: (authUser: AuthUser) => authUser.lastName,
  },
  {
    profileKey: "email",
    providerPath: "email",
    defaultValue: (authUser: AuthUser) => authUser.email,
  },
  { profileKey: "phone", providerPath: ["attributes", "phone"] },
  { profileKey: "address", providerPath: ["attributes", "address"] },
  { profileKey: "businessName", providerPath: ["attributes", "businessName"] },
  {
    profileKey: "gstNumber",
    providerPath: ["attributes", "gstNumber"],
    write: (profile: IdentityProfile) => profile.gstNumber ?? "",
  },
  {
    profileKey: "vendorCodes",
    providerPath: ["attributes", "vendorCodes"],
    read: readVendorCodes,
  },
] satisfies ProfileFieldMapping[];

export function authentikUserToProfile(
  authUser: AuthUser,
  user: AuthentikUser,
): IdentityProfile {
  return profileFromProvider(
    authUser,
    user as Record<string, unknown>,
    authentikProfileMap,
  );
}

export function profileToAuthentikUser(
  profile: IdentityProfile,
): AuthentikUser {
  const mapped = profileToProvider(
    profile,
    authentikProfileMap,
  ) as AuthentikUser;
  return {
    ...mapped,
    name: `${profile.firstName} ${profile.lastName}`.trim(),
    attributes: mapped.attributes ?? {},
  };
}

export class AuthentikIdentityProfileProvider implements IdentityProfileProvider {
  private readonly baseUrl = config.authentikBaseUrl!.replace(/\/$/, "");

  private headers(contentType = false): HeadersInit {
    return {
      Accept: "application/json",
      Authorization: `Bearer ${config.authentikToken!}`,
      ...(contentType ? { "Content-Type": "application/json" } : {}),
    };
  }

  private userUrl(identifier: string | number) {
    return `${this.baseUrl}/api/v3/core/users/${encodeURIComponent(String(identifier))}/`;
  }

  private async fetchUserByUrl(
    url: string,
  ): Promise<AuthentikUser | undefined> {
    const response = await fetch(url, { headers: this.headers() });
    if (response.status === 404) {
      return undefined;
    }
    if (!response.ok) {
      throw new Error(`Authentik profile read failed: ${response.status}`);
    }
    return (await response.json()) as AuthentikUser;
  }

  private async resolveUser(authUser: AuthUser): Promise<AuthentikUser> {
    const subjectUser = await this.fetchUserByUrl(
      this.userUrl(authUser.subject),
    );
    if (subjectUser) {
      return subjectUser;
    }

    const searchUrl = new URL(`${this.baseUrl}/api/v3/core/users/`);
    searchUrl.searchParams.set("search", authUser.email);
    const response = await fetch(searchUrl, { headers: this.headers() });
    if (!response.ok) {
      throw new Error(`Authentik profile lookup failed: ${response.status}`);
    }
    const users = ((await response.json()) as AuthentikUserList).results ?? [];
    const user =
      users.find((candidate) => candidate.uid === authUser.subject) ??
      users.find(
        (candidate) =>
          candidate.email === authUser.email ||
          candidate.username === authUser.email,
      );
    if (!user) {
      throw new Error("Authentik profile lookup failed: user not found");
    }
    return user;
  }

  async getProfile(authUser: AuthUser): Promise<IdentityProfile> {
    return authentikUserToProfile(authUser, await this.resolveUser(authUser));
  }

  async updateProfile(
    authUser: AuthUser,
    patch: IdentityProfilePatch,
  ): Promise<IdentityProfile> {
    const currentUser = (await this.resolveUser(authUser)) as AuthentikUser &
      Record<string, unknown>;
    const current = authentikUserToProfile(authUser, currentUser);
    const profile = mergeIdentityProfile(
      authUser,
      current,
      parseIdentityProfilePatch(patch),
    );
    const response = await fetch(
      this.userUrl(currentUser.pk ?? authUser.subject),
      {
        method: "PATCH",
        headers: this.headers(true),
        body: JSON.stringify({
          ...profileToAuthentikUser(profile),
        }),
      },
    );
    if (!response.ok) {
      throw new Error(`Authentik profile update failed: ${response.status}`);
    }
    return profile;
  }
}
