import type { FastifyInstance } from "fastify";

export class BaseController {
  constructor(protected readonly app: FastifyInstance) {}
}
