import {
  businessInformationSchema,
  identityProfileSchema,
  profileSchema,
  type BusinessInformation,
  type CustomerProfile,
  type IdentityProfile,
} from "@expresspass/shared";
import type { AuthUser } from "../plugins/auth.js";

export type IdentityProfilePatch =
  | CustomerProfile
  | BusinessInformation
  | IdentityProfile;

export const emptyIdentityProfileDefaults = {
  address: { line1: "", line2: "", city: "", province: "AB", postalCode: "" },
  phone: "",
  businessName: "",
  gstNumber: "",
  vendorCodes: undefined,
};

export type ProviderPath = string | string[];

export type ProfileFieldMapping = {
  profileKey: keyof IdentityProfile;
  providerPath: ProviderPath;
  defaultValue?: (authUser: AuthUser) => unknown;
  read?: (value: unknown) => unknown;
  write?: (profile: IdentityProfile) => unknown;
  omitWrite?: (profile: IdentityProfile) => boolean;
};

function pathParts(path: ProviderPath): string[] {
  return Array.isArray(path) ? path : [path];
}

function readPath(source: unknown, path: ProviderPath): unknown {
  return pathParts(path).reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    return (current as Record<string, unknown>)[part];
  }, source);
}

function writePath(
  target: Record<string, unknown>,
  path: ProviderPath,
  value: unknown,
): void {
  const parts = pathParts(path);
  const last = parts.at(-1);
  if (!last) {
    return;
  }
  let current = target;
  for (const part of parts.slice(0, -1)) {
    const next = current[part];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[last] = value;
}

export function baseIdentityProfile(authUser: AuthUser): IdentityProfile {
  return identityProfileSchema.parse({
    ...emptyIdentityProfileDefaults,
    firstName: authUser.firstName,
    lastName: authUser.lastName,
    email: authUser.email,
  });
}

export function mergeIdentityProfile(
  authUser: AuthUser,
  current: IdentityProfile | undefined,
  patch: Partial<IdentityProfile>,
): IdentityProfile {
  return identityProfileSchema.parse({
    ...(current ?? baseIdentityProfile(authUser)),
    ...patch,
    firstName: patch.firstName ?? current?.firstName ?? authUser.firstName,
    lastName: patch.lastName ?? current?.lastName ?? authUser.lastName,
    email: patch.email ?? current?.email ?? authUser.email,
  });
}

export function parseIdentityProfilePatch(
  patch: IdentityProfilePatch,
): Partial<IdentityProfile> {
  if ("email" in patch) {
    return identityProfileSchema.parse(patch);
  }
  if ("vendorCodes" in patch) {
    return businessInformationSchema.parse(patch);
  }
  return profileSchema.parse(patch);
}

// Accepts either a native array (Authentik JSON attributes) or a comma-separated string
// (Cognito custom attributes, which are plain strings) so both providers can share this.
export function readVendorCodes(value: unknown): number[] | undefined {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string" && value.length > 0
      ? value.split(",")
      : undefined;
  if (!raw) {
    return undefined;
  }
  const codes = raw
    .map((entry) => Number(entry))
    .filter(
      (code) => Number.isInteger(code) && code >= 100 && code <= 999,
    );
  return codes.length > 0 ? codes : undefined;
}

export function profileFromProvider(
  authUser: AuthUser,
  source: Record<string, unknown>,
  mappings: ProfileFieldMapping[],
): IdentityProfile {
  const profile = baseIdentityProfile(authUser) as Record<
    keyof IdentityProfile,
    unknown
  >;

  for (const mapping of mappings) {
    const rawValue = readPath(source, mapping.providerPath);
    const value =
      rawValue === undefined || rawValue === null || rawValue === ""
        ? mapping.defaultValue?.(authUser)
        : mapping.read
          ? mapping.read(rawValue)
          : rawValue;
    if (value !== undefined) {
      profile[mapping.profileKey] = value;
    }
  }

  return identityProfileSchema.parse(profile);
}

export function profileToProvider(
  profile: IdentityProfile,
  mappings: ProfileFieldMapping[],
): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const mapping of mappings) {
    if (mapping.omitWrite?.(profile)) {
      continue;
    }
    const value = mapping.write
      ? mapping.write(profile)
      : profile[mapping.profileKey];
    writePath(output, mapping.providerPath, value);
  }

  return output;
}
