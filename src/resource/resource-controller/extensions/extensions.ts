import path from 'node:path';
import type { FastifyPluginAsync, preSerializationAsyncHookHandler } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import type { Collection } from '../../../database/types.js';
import type { Extension, ExtensionsPlugin } from './types.js';
import { isResource, isResourceList } from './utils/index.js';

const extensionsPlugin: FastifyPluginAsync = async (fastify) => {
  const loadExtensions = async () => {
    if (!process.env.EXTENSIONS) {
      console.info('"EXTENSIONS" environment variable is not set. Skipping extension loading.');
      return null;
    }

    const extensionsFile = path.resolve(process.cwd(), process.env.EXTENSIONS);

    try {
      const extensions: Extension[] = (await import(extensionsFile)).default;

      console.info('Loaded extensions:', extensions.map((e) => e.name).join());

      return extensions;
    } catch (error) {
      console.error(`Failed to load extensions from ${extensionsFile}:`, error);
      return null;
    }
  };

  const extensions = await loadExtensions();

  const getExtensions = (collection: Collection) => {
    if (!extensions || !collection.schema) return null;

    return extensions.filter((extension) => {
      return collection.schema?.['x-extensions']?.includes(extension.name);
    });
  };

  const preSerialization: preSerializationAsyncHookHandler = async (request, reply, data) => {
    if (isResource(data)) {
      const collection = await reply.server.database.collection.findUniqueOrThrow({ where: { id: data.collectionId } });
      const extensions = getExtensions(collection);

      if (!extensions) return data;

      return extensions.reduce((acc, extension) => {
        acc.payload = extension.transformPayload({ query: request.query, resource: acc, collection });
        return acc;
      }, data);
    }

    if (isResourceList(data)) {
      const collection = await reply.server.database.collection.findUniqueOrThrow({
        where: { id: data.at(0)?.collectionId },
      });
      const extensions = getExtensions(collection);

      if (!extensions) return data;

      return data.map((resource) => {
        return extensions.reduce((acc, extension) => {
          acc.payload = extension.transformPayload({ query: request.query, resource: acc, collection });
          return acc;
        }, resource);
      });
    }

    return data;
  };

  fastify.decorate<ExtensionsPlugin>('extensions', { preSerialization });
};

export default fastifyPlugin(extensionsPlugin);
