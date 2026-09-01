import type { FastifyRequest } from "fastify";
import type { CustomerRole } from "@expresspass/shared";

export type AuthUser = {
  subject: string;
  email: string;
  role: CustomerRole;
};

declare module "fastify" {
  interface FastifyRequest {
    authUser: AuthUser;
  }
}

function roleFromGroups(groups: unknown): CustomerRole {
  const values = Array.isArray(groups)
    ? groups
    : typeof groups === "string"
      ? groups.split(",")
      : [];
  return values.some((group) => String(group).toLowerCase() === "business")
    ? "business"
    : "public";
}

export async function authenticate(request: FastifyRequest): Promise<void> {
  if (request.url === "/health") {
    return;
  }
  const decoded = await request.jwtVerify<Record<string, unknown>>();
  const email = String(decoded.email ?? "");
  const subject = String(decoded.sub ?? "");
  if (!email || !subject) {
    throw new Error("Missing required OIDC claims");
  }

  request.authUser = {
    subject,
    email,
    role: roleFromGroups(decoded["cognito:groups"] ?? decoded.groups),
  };
}
