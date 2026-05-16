import { faker } from '@faker-js/faker';
import type { Collection } from '@prisma/client';
import { describe, expect } from 'vitest';
import { test as testBase } from '../../tests/index.js';
import resourceService from './resource-service.js';
import type { ResourceService } from './types.js';

interface Fixtures {
  resourceService: ResourceService;
}

interface ResourceRelationFixtures {
  authorsCollection: Collection;
  booksCollection: Collection;
}

const test = testBase.extend<Fixtures>({
  resourceService: async ({ server }, use) => {
    if (!server.resourceService) {
      server.register(resourceService);
    }

    await server.ready();

    use(server.resourceService);
  },
});

describe('Resource service', () => {
  test('Read one resource by id', async ({ resourceService, resourceFactory, oneCollection }) => {
    const newResource = await resourceFactory.createResource(oneCollection);

    const resource = await resourceService.readResource({
      resourceId: newResource.id,
    });

    expect(resource).toMatchObject(newResource);
  });

  test('Read one resource including its objects', async ({ resourceService, oneObject }) => {
    const resource = await resourceService.readResource({
      resourceId: oneObject.resourceId,
      include: { objects: true },
    });

    const objects = resource.objects;
    const object = objects?.at(0);

    expect(objects).toBeDefined();
    expect(object).toHaveProperty('url');
  });

  test('Read resource list including their objects', async ({
    resourceService,
    resourceFactory,
    oneCollection,
    objectFactory,
  }) => {
    const newResource = await resourceFactory.createResource(oneCollection);
    await objectFactory.createObject(newResource);

    const resources = await resourceService.readResourceList({
      collectionId: newResource.collectionId,
      include: { objects: true },
    });

    // Check if resources have objects array:
    const hasObjectsArray = resources.every((r) => Array.isArray(r.objects));

    expect(hasObjectsArray).toBeTruthy();

    // Check the first object's structure:
    const object = resources.at(0)?.objects?.at(0);

    expect(object).toBeDefined();
    expect(object).toHaveProperty('url');
  });

  describe('Resource validation against schema', () => {
    test('Resource validation against schema', async ({ collectionFactory, oneProject, resourceService }) => {
      const JSON_SCHEMA = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer', minimum: 18 },
          email: { type: 'string' },
        },
        required: ['name', 'age', 'email'],
      };

      const RESOURCE_INVALID_PAYLOAD = { name: 123, age: 16, email: 'email' };
      const RESOURCE_VALID_PAYLOAD = {
        name: 'John',
        age: 30,
        email: faker.internet.email(),
      };

      const collectionWithSchema = await collectionFactory.createCollection({
        project: { connect: { id: oneProject.id } },
        name: 'Collection with schema',
        schema: JSON_SCHEMA,
      });

      await expect(
        resourceService.createResource({
          collectionId: collectionWithSchema.id,
          payload: RESOURCE_INVALID_PAYLOAD,
        }),
      ).rejects.toThrow();

      await expect(
        resourceService.createResource({
          collectionId: collectionWithSchema.id,
          payload: RESOURCE_VALID_PAYLOAD,
        }),
      ).resolves.toMatchObject({ payload: RESOURCE_VALID_PAYLOAD });
    });
  });

  describe('Resource relations', () => {
    // Custom test fixture that sets up related collections for testing resource relationships
    const relationsTest = test.extend<ResourceRelationFixtures>({
      // "Authors" collection that will store author resources
      authorsCollection: async ({ collectionFactory, oneProject }, use) => {
        const authorsCollection = await collectionFactory.createCollection({
          name: 'Authors',
          project: { connect: { id: oneProject.id } },
          schema: {
            $schema: 'http://json-schema.org/draft-07/schema#',
            type: 'object',
            required: ['name', 'email', 'department'],
            properties: {
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
              department: { type: 'string' },
            },
          },
        });

        await use(authorsCollection);
      },

      // "Books" collection with a schema that includes a resource relation to authors
      booksCollection: async ({ collectionFactory, oneProject }, use) => {
        const booksCollection = await collectionFactory.createCollection({
          name: 'Books',
          project: { connect: { id: oneProject.id } },
          schema: {
            $schema: 'http://json-schema.org/draft-07/schema#',
            type: 'object',
            required: ['title', 'description', 'author'],
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              author: { type: 'string', 'x-type': 'resource' },
            },
          },
        });

        await use(booksCollection);
      },
    });

    relationsTest(
      'Create and read resource with relation',
      async ({ resourceService, authorsCollection, booksCollection }) => {
        // Create an author resource (the "parent" resource that will be referenced)
        const authorResource = await resourceService.createResource({
          collectionId: authorsCollection.id,
          payload: {
            name: 'Test author',
            email: 'author@example.com',
            department: 'Test department',
          },
        });

        // Create a book resource that references the author by ID.
        const bookResource = await resourceService.createResource({
          collectionId: booksCollection.id,
          payload: {
            title: 'Test title',
            description: 'Test description',
            author: authorResource.id,
          },
        });

        // Read the book resource and explicitly request to include the author relation
        // The 'relations' parameter tells the API to fetch and populate referenced resources
        const resource = await resourceService.readResource({
          resourceId: bookResource.id,
          relations: ['author'],
        });

        // Verify that the response includes a 'relations' object with the populated author data
        expect(resource).toHaveProperty('relations');
        expect(resource.relations).toHaveProperty('author');
        expect(resource.relations?.author).toMatchObject(authorResource);
      },
    );

    relationsTest('Update resource relation', async ({ resourceService, authorsCollection, booksCollection }) => {
      // Create initial author and book with relation
      const authorResource = await resourceService.createResource({
        collectionId: authorsCollection.id,
        payload: {
          name: 'Test author',
          email: 'test@example.com',
          department: 'Test departament',
        },
      });
      const bookResource = await resourceService.createResource({
        collectionId: booksCollection.id,
        payload: {
          title: 'Test title',
          description: 'Test description',
          author: authorResource.id,
        },
      });

      // Create a second author to change the relationship to
      const newAuthorResource = await resourceService.createResource({
        collectionId: authorsCollection.id,
        payload: {
          name: 'New author',
          email: 'new-author@example.com',
          department: 'Test department',
        },
      });

      // Update the book resource to reference the new author instead
      await resourceService.updateResource(bookResource.id, {
        payload: { ...bookResource.payload, author: newAuthorResource.id },
      });

      // Read the updated resource and verify the relation has changed
      const updatedResource = await resourceService.readResource({
        resourceId: bookResource.id,
        relations: ['author'],
      });

      expect(updatedResource.payload.author).toEqual(newAuthorResource.id);
      expect(updatedResource.relations?.author).toMatchObject(newAuthorResource);
    });

    relationsTest(
      'Update resource with new relation',
      async ({ resourceService, authorsCollection, booksCollection, resourceFactory, collectionFactory, server }) => {
        // Create initial author and book with relation
        const authorResource = await resourceService.createResource({
          collectionId: authorsCollection.id,
          payload: {
            name: 'Test author',
            email: 'test@example.com',
            department: 'Test departament',
          },
        });
        const bookResource = await resourceService.createResource({
          collectionId: booksCollection.id,
          payload: {
            title: 'Test title',
            description: 'Test description',
            author: authorResource.id,
          },
        });

        // Create a new resource (translation) in a separate collection
        const translationsCollection = await collectionFactory.createCollection();
        const translationResource = await resourceFactory.createResource(translationsCollection, {
          ru: { title: 'Книга' },
        });

        // Update the Books collection schema to add a new relation field
        await server.database.collection.update({
          where: { id: booksCollection.id },
          data: {
            ...booksCollection,
            schema: {
              ...booksCollection.schema,
              properties: {
                ...booksCollection.schema.properties,
                translation: { type: 'string', 'x-type': 'resource' },
              },
            },
          },
        });

        // Update the book to include the new translation relation
        await resourceService.updateResource(bookResource.id, {
          payload: {
            ...bookResource.payload,
            translation: translationResource.id,
          },
        });

        // Read the book with new relation populated
        const updatedResource = await resourceService.readResource({
          resourceId: bookResource.id,
          relations: ['translation'],
        });

        // Verify the new relation was added and populated correctly
        expect(updatedResource.relations).toHaveProperty('translation');
        expect(updatedResource.relations?.translation).toMatchObject(translationResource);
      },
    );

    relationsTest(
      'Read resource with nested relation two levels deep',
      async ({ resourceService, authorsCollection, booksCollection, resourceFactory, oneCollection, server }) => {
        // Create a department resource that will be referenced as a nested relation
        const departmentResource = await resourceFactory.createResource(oneCollection, { name: 'Test department' });

        // Update the Authors collection schema to change the 'department' field from string to resource relation
        // This enables linking authors to department resources instead of just storing department names
        await server.database.collection.update({
          where: { id: authorsCollection.id },
          data: {
            schema: {
              ...authorsCollection.schema,
              properties: {
                ...authorsCollection.schema.properties,
                department: { type: 'string', 'x-type': 'resource' },
              },
            },
          },
        });

        // Create an author resource that references the department by ID (nested relation)
        const authorResource = await resourceService.createResource({
          collectionId: authorsCollection.id,
          payload: {
            name: 'Test author',
            email: 'test@example.com',
            department: departmentResource.id,
          },
        });

        // Create a book resource that references the author (first-level relation)
        const bookResource = await resourceService.createResource({
          collectionId: booksCollection.id,
          payload: {
            title: 'Test title',
            description: 'Test description',
            author: authorResource.id,
          },
        });

        // Read the book and request both immediate relation (author) and nested relation (author.department)
        // The 'relations' parameter supports dot notation to request nested relations
        const resource = await resourceService.readResource({
          resourceId: bookResource.id,
          relations: ['author', 'department'], // 'department' here refers to author.department
        });

        // Verify that the nested department relation is populated under author.relations
        expect(resource.relations?.author?.relations).toHaveProperty('department');
        expect(resource.relations?.author?.relations?.department).toMatchObject(departmentResource);
      },
    );
  });
});
