import type {
  FastifyRequest,
  preHandlerHookHandler,
} from "fastify";
import fp from "fastify-plugin";
import { fastifyJwtJwks } from "fastify-jwt-jwks";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import type { Customer, CustomerRole } from "@expresspass/shared";
import { config } from "../config/index.js";
import { ensureCustomer } from "../repositories/customers.js";

export type AuthUser = {
  subject: string;
  email: string;
  firstName: string;
  lastName: string;
  role: CustomerRole;
};

declare module "fastify" {
  interface FastifyInstance {
    requireAuth: preHandlerHookHandler;
    requireCustomer: preHandlerHookHandler;
    requireRole: (
      role: CustomerRole,
      notFoundMessage?: string,
    ) => preHandlerHookHandler;
  }

  interface FastifyRequest {
    authUser: AuthUser;
    customer: Customer;
  }
}

type OidcClaims = Record<string, unknown> & {
  sub?: unknown;
  email?: unknown;
  given_name?: unknown;
  family_name?: unknown;
  name?: unknown;
  groups?: unknown;
  "cognito:groups"?: unknown;
};

const authPluginImplementation: FastifyPluginAsyncZod = async (app) => {
  await app.register(fastifyJwtJwks, {
    jwksUrl: config.oidcJwksUrl,
    issuer: config.oidcIssuer,
    audience: config.oidcAudience,
  });

  app.decorate("requireAuth", requireAuth);
  app.decorate("requireCustomer", requireCustomer);
  app.decorate("requireRole", requireRole);
};

export const authPlugin = fp(authPluginImplementation, {
  name: "expresspass-auth",
});

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

function bearerToken(request: FastifyRequest): string | undefined {
  const header = request.headers.authorization;
  const [scheme, token] = typeof header === "string" ? header.split(" ") : [];
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return undefined;
  }
  return token;
}

function oidcClaims(request: FastifyRequest): OidcClaims {
  const { user } = request;
  if (user && typeof user === "object" && !Buffer.isBuffer(user)) {
    return user as OidcClaims;
  }
  return {};
}

function hasRequestProperty(request: FastifyRequest, property: string): boolean {
  return Object.prototype.hasOwnProperty.call(request, property);
}

async function requireAuth(request: FastifyRequest): Promise<void> {
  if (hasRequestProperty(request, "authUser")) {
    return;
  }
  const token = bearerToken(request);
  if (!token) {
    throw request.server.httpErrors.unauthorized("Missing bearer token");
  }
  await request.server.authenticate(request).catch(() => {
    throw request.server.httpErrors.unauthorized("Invalid bearer token");
  });
  const decoded = oidcClaims(request);
  const email = String(decoded.email ?? "");
  const subject = String(decoded.sub ?? "");
  if (!email || !subject) {
    throw new Error("Missing required OIDC claims");
  }

  request.authUser = {
    subject,
    email,
    firstName: String(decoded.given_name ?? decoded.name ?? ""),
    lastName: String(decoded.family_name ?? ""),
    role: roleFromGroups(decoded["cognito:groups"] ?? decoded.groups),
  };
}

async function requireCustomer(request: FastifyRequest): Promise<void> {
  if (hasRequestProperty(request, "customer")) {
    return;
  }
  await requireAuth(request);
  request.customer = await ensureCustomer(request.authUser);
}

function requireRole(
  role: CustomerRole,
  notFoundMessage = "Resource not found",
): preHandlerHookHandler {
  return async (request) => {
    await requireCustomer(request);
    if (request.customer.role !== role) {
      throw request.server.httpErrors.notFound(notFoundMessage);
    }
  };
}
