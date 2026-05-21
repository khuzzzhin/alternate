/**
 * @file Beware that this file could run multiple times (once per test file),
 * because vitest runs each test file in isolation by default.
 * @see https://vitest.dev/config/#setupfiles
 * @see https://vitest.dev/guide/improving-performance
 */

import { inspect as nodeInspect } from 'node:util';
import { faker } from '@faker-js/faker';
import type { FastifyInstance } from 'fastify';
import { Client as MinioClient } from 'minio';
import { inject, test as testBase } from 'vitest';
import { buildServer } from '../build-server.js';
import type { Fixtures } from './types.js';

export let server: FastifyInstance | null = null;

export const test = testBase.extend<Fixtures>({
  server: async ({}, use) => {
    if (!server) {
      server = buildServer({
        databaseOptions: { url: inject('DATABASE_URL') },
        minioOptions: {
          host: inject('MINIO_HOST'),
          port: inject('MINIO_PORT'),
          accessKey: inject('MINIO_ACCESS_KEY'),
          secretKey: inject('MINIO_SECRET_KEY'),
          bucketName: inject('MINIO_BUCKET_NAME'),
          useSSL: false,
        },
      });
    }

    await use(server);
  },

  oneProject: async ({ server }, use) => {
    const project = await server.database.project.create({
      data: { name: 'Test project' },
    });

    await use(project);

    await server.database.project.deleteMany();
  },

  manyProjects: async ({ server }, use) => {
    const projectsData = Array(10)
      .fill(null)
      .map((item, index) => ({
        name: `Project ${index}`,
      }));

    await server.database.project.createMany({
      data: projectsData,
    });

    const projects = await server.database.project.findMany();

    await use(projects);

    await server.database.project.deleteMany();
  },

  oneCollection: async ({ server, oneProject }, use) => {
    const collection = await server.database.collection.create({
      data: { name: 'Test collection', projectId: oneProject.id },
    });

    await use(collection);

    await server.database.collection.deleteMany();
  },

  manyCollections: async ({ server, oneProject }, use) => {
    const collectionsData = Array(10)
      .fill(null)
      .map((item, index) => ({
        name: `Collection ${index}`,
        projectId: oneProject.id,
      }));

    await server.database.collection.createMany({
      data: collectionsData,
    });

    const collections = await server.database.collection.findMany();

    await use(collections);

    await server.database.collection.deleteMany();
  },

  collectionFactory: async ({ server, oneProject }, use) => {
    const createCollection: Fixtures['collectionFactory']['createCollection'] = async (data) => {
      return await server.database.collection.create({
        data: data || {
          name: faker.string.alpha(8),
          projectId: oneProject.id,
        },
      });
    };

    await use({ createCollection });
  },

  oneResource: async ({ server, oneCollection }, use) => {
    const resource = await server.database.resource.create({
      data: {
        collectionId: oneCollection.id,
        payload: {
          propertyString: 'string',
          propertyNumber: 1,
          propertyBoolean: true,
          propertyObject: { foo: 'bar' },
        },
      },
    });

    await use(resource);

    await server.database.resource.deleteMany();
  },

  manyResources: async ({ server, oneCollection }, use) => {
    const NUMBER_OF_RESOURCES_TO_CREATE = 10;

    await server.database.resource.createMany({
      data: Array(NUMBER_OF_RESOURCES_TO_CREATE)
        .fill(null)
        .map(() => ({
          collectionId: oneCollection.id,
          payload: {},
        })),
    });

    const resources = await server.database.resource.findMany();

    await use(resources);

    await server.database.resource.deleteMany();
  },

  resourceFactory: async ({ server }, use) => {
    const createResource: Fixtures['resourceFactory']['createResource'] = async (collection, payload) => {
      return await server.database.resource.create({
        data: {
          collectionId: collection.id,
          payload: payload || {
            propertyString: 'string',
            propertyNumber: 1,
            propertyBoolean: true,
            propertyObject: { foo: 'bar' },
          },
        },
      });
    };

    await use({ createResource });
  },

  minioClient: async ({}, use) => {
    const minioOptions = {
      host: inject('MINIO_HOST'),
      port: inject('MINIO_PORT'),
      accessKey: inject('MINIO_ACCESS_KEY'),
      secretKey: inject('MINIO_SECRET_KEY'),
      bucketName: inject('MINIO_BUCKET_NAME'),
      useSSL: false,
    };

    const minioClient = new MinioClient({
      endPoint: minioOptions.host,
      port: minioOptions.port,
      useSSL: minioOptions.useSSL,
      accessKey: minioOptions.accessKey,
      secretKey: minioOptions.secretKey,
    });

    await use(minioClient);
  },

  bucketName: async ({}, use) => {
    await use(inject('MINIO_BUCKET_NAME'));
  },

  oneFile: async ({}, use) => {
    const file = {
      name: 'file.md',
      content: new Blob(['Content of the file']),
    };

    await use(file);
  },

  oneObject: async ({ server, oneFile, oneResource }, use) => {
    const object = await server.database.object.create({
      data: {
        resourceId: oneResource.id,
        fileName: oneFile.name,
      },
    });

    await use(object);

    await server.database.object.deleteMany();
  },

  objectFactory: async ({ server, oneFile }, use) => {
    const createObject = async (resource: Fixtures['oneResource']) => {
      return await server.database.object.create({
        data: {
          resourceId: resource.id,
          fileName: oneFile.name,
        },
      });
    };

    await use({ createObject });
  },

  authFactory: async ({ server }, use) => {
    const createUserWithRole = async (role: 'user' | 'admin') => {
      const credentials = {
        email: faker.internet.email(),
        password: faker.internet.password(),
      };

      const { user } = await server.auth.api.createUser({
        body: {
          ...credentials,
          name: faker.internet.username(),
          role: role,
        },
      });

      return { user, credentials };
    };

    const signIn: Fixtures['authFactory']['signIn'] = async (credentials) => {
      const { headers } = await server.auth.api.signInEmail({
        body: credentials,
        returnHeaders: true,
      });

      return { Cookie: headers.getSetCookie().at(0) };
    };

    const inject: Fixtures['authFactory']['inject'] = async (options) => {
      const credentials =
        'userCredentials' in options
          ? options.userCredentials
          : (await createUserWithRole(options.userRole)).credentials;

      const authHeaders = await signIn(credentials);

      return await server.inject({ ...options, headers: { ...options.headers, ...authHeaders } });
    };

    await use({ createUserWithRole, signIn, inject });
  },

  utils: async ({}, use) => {
    const inspect = (object: unknown, showHidden = true, depth = 16) => {
      return console.info(nodeInspect(object, showHidden, depth));
    };

    use({ inspect });
  },
});
