import type { Resource } from '@prisma/client';
import { describe, expect } from 'vitest';
import { test } from '../tests';

describe('Resource reading', () => {
  test('Cannot read list of resources with no collection id', async ({ server }) => {
    const response = await server.inject({
      url: '/resource',
      method: 'GET',
    });

    expect(response.statusCode).toBe(400);
  });

  test('Can read list of resources of single collection only', async ({ server, oneProject }) => {
    const collectionWithResources = await server.database.collection.create({
      data: {
        name: 'Collection with resources',
        projectId: oneProject.id,
        resources: {
          createMany: {
            data: [{ payload: {} }, { payload: {} }, { payload: {} }, { payload: {} }],
          },
        },
      },
      include: { resources: true },
    });

    const response = await server.inject({
      url: '/resource',
      method: 'GET',
      query: { collectionId: collectionWithResources.id },
    });

    const resources: Resource[] = response.json();

    expect(response.statusCode).toBe(200);
    expect(resources).toHaveLength(collectionWithResources.resources.length);
    expect(resources.every((resource) => resource.collectionId === collectionWithResources.id)).toBe(true);
  });

  test('Resource have payload property', async ({ server, oneResource }) => {
    const response = await server.inject({
      url: `/resource`,
      method: 'GET',
      query: {
        collectionId: oneResource.collectionId,
      },
    });

    const parsedBody = JSON.parse(response.body);
    const resource = parsedBody.at(0);

    expect(resource).toHaveProperty('payload');
  });
});

describe('Resource creating/updating', () => {
  test('Can create resource with valid payload', async ({ server, oneCollection }) => {
    const payload: Resource['payload'] = { foo: 'bar' };

    const response = await server.inject({
      url: '/resource',
      method: 'POST',
      payload: {
        collectionId: oneCollection.id,
        payload: payload,
      },
    });

    const parsedBody = JSON.parse(response.body);
    const resourcesCount = await server.database.resource.count();

    expect(response.statusCode).toBe(201);
    expect(resourcesCount).toBe(1);
    expect(parsedBody.payload).toEqual(payload);
  });

  test('Can update payload of resource', async ({ server, oneResource: resourceToUpdate }) => {
    const newPayload: Resource['payload'] = {
      newProperty: 'newValue',
    };

    const response = await server.inject({
      url: `/resource/${resourceToUpdate.id}`,
      method: 'PATCH',
      payload: { payload: newPayload },
    });

    const updatedResource = JSON.parse(response.body) as Resource;

    expect(response.statusCode).toBe(200);
    expect(updatedResource.payload).toEqual(newPayload);
  });

  test('Cannot move resource to other collection by changing collectionId', async ({
    server,
    oneProject,
    oneResource: resourceToUpdate,
  }) => {
    const oldCollectionId = resourceToUpdate.collectionId;

    const { id: newCollectionId } = await server.database.collection.create({
      data: { name: 'new collection', projectId: oneProject.id },
    });

    const response = await server.inject({
      url: `/resource/${resourceToUpdate.id}`,
      method: 'PATCH',
      payload: { payload: {}, collectionId: newCollectionId },
    });

    const updatedResource = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(updatedResource.collectionId).toEqual(oldCollectionId);
  });

  describe('Cannot create or update resource with invalid payload', async () => {
    const INVALID_VARIANTS_OF_PAYLOAD: unknown[] = [
      undefined, // undefined
      null, // null
      'string', // string
      0, // number
      [], // array
      true, // boolean
    ];

    for (const [index, payload] of INVALID_VARIANTS_OF_PAYLOAD.entries()) {
      test(`Cannot create resource with invalid payload: ${index}`, async ({ server, oneCollection }) => {
        const response = await server.inject({
          url: '/resource',
          method: 'POST',
          payload: {
            collectionId: oneCollection.id,
            payload: payload,
          },
        });

        const resourcesCount = await server.database.resource.count();

        expect(response.statusCode).toBe(400);
        expect(resourcesCount).toBe(0);
      });
    }

    for (const [index, payload] of INVALID_VARIANTS_OF_PAYLOAD.entries()) {
      test(`Cannot update resource with invalid payload: ${index}`, async ({ server, oneResource }) => {
        const response = await server.inject({
          url: `/resource/${oneResource.id}`,
          method: 'PATCH',
          payload: {
            payload: payload,
          },
        });

        expect(response.statusCode).toBe(400);
      });
    }
  });
});

test('Resources should have correct createdAt/updatedAt fields', async ({ server, oneResource }) => {
  const response = await server.inject({
    url: `/resource`,
    method: 'GET',
    query: {
      collectionId: oneResource.collectionId,
    },
  });

  const parsedBody: Resource[] = JSON.parse(response.body);

  const resource = parsedBody[0];

  expect(resource).toHaveProperty('createdAt');
  expect(resource).toHaveProperty('updatedAt');

  const updateResponse = await server.inject({
    url: `/resource/${oneResource.id}`,
    method: 'PATCH',
    payload: { payload: { ...oneResource.payload, newProperty: 'newValue' } },
  });

  const updatedResource: Resource = JSON.parse(updateResponse.body);

  expect(updatedResource.createdAt).toEqual(resource.createdAt);
  expect(updatedResource.updatedAt).not.toEqual(resource.updatedAt);
});

test.todo("Filtering resource list using 'where' query parameter");
