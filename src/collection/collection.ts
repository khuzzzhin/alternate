import type { FastifyPluginAsync } from 'fastify';
import { collectionController } from './collection-controller/index.js';

export const collection: FastifyPluginAsync = async (fastify) => {
  fastify.register(collectionController);
};
