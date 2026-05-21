import type { PrismaClientExtended } from './types.js';

declare module 'fastify' {
  interface FastifyInstance {
    database: PrismaClientExtended;
  }
}

export { default as database } from './database.js';
export type { DatabaseOptions } from './types.js';
