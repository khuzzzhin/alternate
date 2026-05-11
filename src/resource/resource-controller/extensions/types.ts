import type { FastifyRequest, preSerializationAsyncHookHandler } from 'fastify';
import type { Collection } from '../../../database/types.js';
import type { Resource } from '../../resource-service/types.js';

export interface ExtensionsPlugin {
  preSerialization: preSerializationAsyncHookHandler;
}

interface PayloadTransformParams {
  query: FastifyRequest['query'];
  resource: Resource;
  collection: Collection;
}

export interface Extension {
  name: string;
  version: string;
  transformPayload: (params: PayloadTransformParams) => Resource['payload'];
}
