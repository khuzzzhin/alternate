import { Ajv } from 'ajv';
import addFormats from 'ajv-formats';
import type { FastifyPluginAsync } from 'fastify';
import { fastifyPlugin } from 'fastify-plugin';
import { objectService } from '../../storage/object-service/index.js';

import { AJV_OPTIONS } from './constants.js';
import type { Resource, ResourceRelationsTransformParams, ResourceService } from './types.js';
import { getResourceOutgoingRelationsArgs } from './utils/index.js';

const resourceService: FastifyPluginAsync = async (fastify) => {
  fastify.register(objectService);

  const ajv = new Ajv(AJV_OPTIONS);
  addFormats.default(ajv);

  const transformRelations = async (params: ResourceRelationsTransformParams) => {
    const { resource } = params;

    if (!('outgoingRelations' in resource)) return undefined;

    const relationsObject: Resource['relations'] = {};

    for (const relation of resource.outgoingRelations) {
      relationsObject[relation.name] = relation.targetResource
        ? await transformResource({ ...params, resource: relation.targetResource })
        : null;
    }

    return relationsObject;
  };

  const transformResource: ResourceService['transformResource'] = async (params) => {
    const { resource } = params;

    const objects = await (async () => {
      if ('objects' in resource) {
        return await Promise.all(resource.objects.map(fastify.objectService.transformObject));
      }

      return undefined;
    })();

    const relations = await transformRelations(params);
    const outgoingRelations = undefined;

    return { ...resource, objects, relations, outgoingRelations };
  };

  const readResource: ResourceService['readResource'] = async (params) => {
    const resource = await fastify.database.resource.findUniqueOrThrow({
      where: { id: params.resourceId },
      include: {
        objects: params.include?.objects,
        outgoingRelations: params.relations ? getResourceOutgoingRelationsArgs(params.relations) : false,
      },
    });

    return await transformResource({ resource });
  };

  const readResourceList: ResourceService['readResourceList'] = async (params) => {
    const resources = await fastify.database.resource.findMany({
      where: { ...params.where, collectionId: params.collectionId },
      include: {
        objects: params.include?.objects,
        outgoingRelations: params.relations ? getResourceOutgoingRelationsArgs(params.relations) : false,
      },
    });

    return await Promise.all(resources.map((resource) => transformResource({ resource })));
  };

  const createResource: ResourceService['createResource'] = async (data) => {
    const collection = await fastify.database.collection.findUniqueOrThrow({
      where: { id: data.collectionId },
    });

    if (collection.schema) {
      const validate = ajv.compile(collection.schema);
      const isValidPayload = validate(data.payload);

      if (!isValidPayload) {
        throw validate.errors;
      }
    }

    const relationsToCreate = collection.schema
      ? Object.entries(collection.schema.properties)
          .filter(([property, propertySchema]) => {
            return propertySchema['x-type'] === 'resource';
          })
          .map(([property]) => {
            return {
              name: property,
              targetResourceId: data.payload[property] as string,
            };
          })
      : [];

    const createdResource = await fastify.database.resource.create({
      data: {
        ...data,
        outgoingRelations: { createMany: { data: relationsToCreate } },
      },
    });

    return createdResource;
  };

  const updateResource: ResourceService['updateResource'] = async (resourceId, data) => {
    const resource = await fastify.database.resource.findUniqueOrThrow({
      where: { id: resourceId },
      include: { collection: true, outgoingRelations: true },
    });

    const collection = resource.collection;

    if (collection.schema) {
      const validate = ajv.compile(collection.schema);
      const isValidPayload = validate(data.payload);

      if (!isValidPayload) {
        throw validate.errors;
      }
    }

    const relationsToCreate = collection.schema
      ? Object.entries(collection.schema.properties)
          .filter(([property, propertySchema]) => {
            return (
              propertySchema['x-type'] === 'resource' && !resource.outgoingRelations.find((r) => r.name === property)
            );
          })
          .map(([property]) => {
            return { name: property, resourceId: resource.id, targetResourceId: data.payload[property] as string };
          })
      : [];

    const relationsToUpdate = resource.outgoingRelations.filter((relation) => {
      return relation.targetResourceId !== data.payload[relation.name];
    });

    const [updatedResource] = await fastify.database.$transaction([
      fastify.database.resource.update({ where: { id: resourceId }, data: data }),
      fastify.database.resourceRelation.createMany({ data: relationsToCreate }),
      ...relationsToUpdate.map((relation) =>
        fastify.database.resourceRelation.update({
          where: { id: relation.id },
          data: { targetResourceId: data.payload[relation.name] as Resource['id'] },
        }),
      ),
    ]);

    return updatedResource;
  };

  fastify.decorate<ResourceService>('resourceService', {
    transformResource,
    readResource,
    readResourceList,
    createResource,
    updateResource,
  });
};

export default fastifyPlugin(resourceService);
