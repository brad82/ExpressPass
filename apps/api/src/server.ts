import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import sensible from "@fastify/sensible";
import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { config } from "./config/index.js";
import { authPlugin } from "./plugins/auth.js";
import { routesPlugin } from "./routes/index.js";

export async function buildServer() {
  const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(helmet);
  await app.register(sensible);
  await app.register(cors, { origin: config.webOrigins });
  await app.register(authPlugin);
  await app.register(routesPlugin);
  return app;
}

const app = await buildServer();
await app.listen({ port: config.port, host: config.host });
