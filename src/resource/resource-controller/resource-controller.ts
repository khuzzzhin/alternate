import type { FastifyPluginAsync } from 'fastify';
import qs from 'qs';
import { INVALID_WHERE_PARAMETER_MESSAGE } from './const.js';
import { extensionsPlugin } from './extensions/index.js';
import { resourceCreateSchema, resourceListReadSchema, resourceReadSchema, resourceUpdateSchema } from './schema.js';
import type {
  ResourceControllerOptions,
  ResourceCreateSchema,
  ResourceListReadSchema,
  ResourceReadSchema,
  ResourceUpdateSchema,
} from './types.js';
import { isValidResourceWhereInput } from './utils.js';

export const resourceController: FastifyPluginAsync<ResourceControllerOptions> = async (fastify, options) => {
  const resourceService = options.resourceService;

  await fastify.register(extensionsPlugin);

  fastify.route<ResourceListReadSchema>({
    method: 'GET',
    url: '/resource',
    schema: resourceListReadSchema,
    preSerialization: fastify.extensions.preSerialization,
    handler: async (request, reply) => {
      const parsedQuery = qs.parse(request.query, { comma: true });

      if (!isValidResourceWhereInput(parsedQuery.where)) {
        return reply.code(400).send(new Error(INVALID_WHERE_PARAMETER_MESSAGE));
      }

      return await resourceService.readResourceList({
        collectionId: request.query.collectionId,
        relations: request.query.relations?.split(','),
        where: parsedQuery.where,
        include: {
          objects: Boolean(request.query.include?.includes('objects')),
        },
      });
    },
  });

  fastify.route<ResourceReadSchema>({
    method: 'GET',
    url: '/resource/:id',
    schema: resourceReadSchema,
    preSerialization: fastify.extensions.preSerialization,
    handler: async (request, reply) => {
      const resource = await resourceService.readResource({
        resourceId: request.params.id,
        relations: request.query.relations?.split(','),
        include: {
          objects: Boolean(request.query.include?.includes('objects')),
        },
      });

      return resource;
    },
  });

  fastify.route<ResourceCreateSchema>({
    method: 'POST',
    url: '/resource',
    schema: resourceCreateSchema,
    handler: async (request, reply) => {
      const createdResource = await resourceService.createResource({
        collectionId: request.body.collectionId,
        payload: request.body.payload,
      });

      return reply.code(201).send(createdResource);
    },
  });

  fastify.route<ResourceUpdateSchema>({
    method: 'PATCH',
    url: '/resource/:id',
    schema: resourceUpdateSchema,
    handler: async (request, reply) => {
      const updatedResource = await resourceService.updateResource(request.params.id, {
        payload: request.body.payload,
      });

      return reply.code(200).send(updatedResource);
    },
  });
};
