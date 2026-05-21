import type { FastifyPluginAsync } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import type { DatabaseOptions } from './types.js';
import { createExtendedPrismaClient } from './utils.js';

/**
 * @TODO https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections#prevent-hot-reloading-from-creating-new-instances-of-prismaclient
 */
const database: FastifyPluginAsync<DatabaseOptions> = async (fastify, options) => {
  const prismaClient = createExtendedPrismaClient(options);

  fastify.addHook('onClose', async () => {
    try {
      await prismaClient.$disconnect();
    } catch (error) {
      console.error(error);
    }
  });

  fastify.decorate<typeof prismaClient>('database', prismaClient);
};

export default fastifyPlugin(database);
