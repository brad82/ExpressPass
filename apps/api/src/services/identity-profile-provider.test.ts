import { describe, expect, it } from "vitest";
import { businessInformationSchema } from "@expresspass/shared";
import type { AuthUser } from "../plugins/auth.js";
import {
  authentikUserToProfile,
  profileToAuthentikUser,
} from "./identity-profile-provider.authentik.js";
import {
  cognitoAttributesToProfile,
  profileToCognitoAttributes,
} from "./identity-profile-provider.cognito.js";

const authUser: AuthUser = {
  subject: "user-123",
  email: "jane@example.com",
  firstName: "Jane",
  lastName: "Summit",
  role: "business",
};

const address = {
  line1: "10 Alpine Way",
  line2: "",
  city: "Canmore",
  province: "AB",
  postalCode: "T1W 0A1",
};

describe("identity profile provider mapping", () => {
  it("maps Cognito attributes into the shared identity profile shape", () => {
    expect(
      cognitoAttributesToProfile(authUser, {
        given_name: "Alex",
        family_name: "North",
        email: "alex@example.com",
        phone_number: "+14035550123",
        address: JSON.stringify(address),
        "custom:business_name": "North Ski Co",
        "custom:vendor_codes": "123,204",
      }),
    ).toMatchObject({
      firstName: "Alex",
      lastName: "North",
      email: "alex@example.com",
      phone: "+14035550123",
      address,
      businessName: "North Ski Co",
      vendorCodes: [123, 204],
    });
  });

  it("maps shared identity profiles to Cognito attributes without requiring optional GST or phone", () => {
    const attributes = profileToCognitoAttributes({
      firstName: "Alex",
      lastName: "North",
      email: "alex@example.com",
      address,
      businessName: "North Ski Co",
      vendorCodes: [123, 204],
    });

    expect(attributes).toContainEqual({
      Name: "custom:vendor_codes",
      Value: "123,204",
    });
    expect(attributes).toContainEqual({ Name: "custom:gst_number", Value: "" });
    expect(
      attributes.some((attribute) => attribute.Name === "phone_number"),
    ).toBe(false);
  });

  it("maps Authentik users through dynamic attributes", () => {
    const profile = authentikUserToProfile(authUser, {
      email: "alex@example.com",
      name: "Alex North",
      attributes: {
        firstName: "Alex",
        lastName: "North",
        phone: "+14035550123",
        address,
        businessName: "North Ski Co",
        vendorCodes: [123, 204],
      },
    });

    expect(profile).toMatchObject({
      firstName: "Alex",
      lastName: "North",
      email: "alex@example.com",
      address,
      businessName: "North Ski Co",
      vendorCodes: [123, 204],
    });
    expect(profileToAuthentikUser(profile).attributes).toMatchObject({
      firstName: "Alex",
      businessName: "North Ski Co",
      vendorCodes: [123, 204],
    });
  });

  it("ignores legacy provider vendor codes outside the 3 digit range", () => {
    expect(
      authentikUserToProfile(authUser, {
        email: "alex@example.com",
        attributes: {
          address,
          vendorCodes: [1000],
        },
      }).vendorCodes,
    ).toBeUndefined();
    expect(
      cognitoAttributesToProfile(authUser, {
        email: "alex@example.com",
        address: JSON.stringify(address),
        "custom:vendor_codes": "not-a-number",
      }).vendorCodes,
    ).toBeUndefined();
  });

  it("accepts optional GST and a set of 3 digit business vendor codes", () => {
    expect(
      businessInformationSchema.parse({ businessName: "North Ski Co" }),
    ).toEqual({
      businessName: "North Ski Co",
    });
    expect(
      businessInformationSchema.parse({
        businessName: "North Ski Co",
        vendorCodes: [123, 204],
      }),
    ).toEqual({
      businessName: "North Ski Co",
      vendorCodes: [123, 204],
    });
    expect(() =>
      businessInformationSchema.parse({
        businessName: "North Ski Co",
        vendorCodes: [12],
      }),
    ).toThrow();
    expect(() =>
      businessInformationSchema.parse({
        businessName: "North Ski Co",
        vendorCodes: [1234],
      }),
    ).toThrow();
  });
});
