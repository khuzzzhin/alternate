import { describe, expect } from 'vitest';
import { test } from '../../tests';

const TEST_PROJECT_NAME = 'test-project-name';

describe('Project controller', () => {
  describe('Project fetching', () => {
    test('Fetch list of projects', async ({ authFactory, manyProjects }) => {
      const response = await authFactory.inject({
        url: '/project',
        method: 'GET',
        userRole: 'admin',
      });

      const { body } = response;
      const parsedBody = JSON.parse(body);

      expect(parsedBody).toEqual(manyProjects);
    });
  });

  describe('Project creating', () => {
    test('Cannot create project without payload', async ({ authFactory }) => {
      const response = await authFactory.inject({
        url: '/project',
        method: 'POST',
        userRole: 'admin',
      });

      expect(response.statusCode).toBe(400);
    });

    test('Cannot create project with an empty name', async ({ authFactory }) => {
      const response = await authFactory.inject({
        url: '/project',
        method: 'POST',
        userRole: 'admin',
        payload: { name: '' },
      });

      expect(response.statusCode).toBe(400);
    });

    test('Create project with a valid payload', async ({ authFactory }) => {
      const response = await authFactory.inject({
        url: '/project',
        method: 'POST',
        userRole: 'admin',
        payload: { name: TEST_PROJECT_NAME },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({ name: TEST_PROJECT_NAME });
    });

    test('Cannot create project with the same name', async ({ server, authFactory }) => {
      await server.database.project.create({ data: { name: TEST_PROJECT_NAME } });

      const response = await authFactory.inject({
        url: '/project',
        method: 'POST',
        userRole: 'admin',
        payload: { name: TEST_PROJECT_NAME },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('User authorization to perform project actions', () => {
    test('Only user with admin role is allowed to create/read projects', async ({
      server,
      oneProject,
      authFactory,
    }) => {
      {
        const { credentials } = await authFactory.createUserWithRole('user');

        const projectCreateResponse = await authFactory.inject({
          method: 'POST',
          url: '/project',
          payload: { name: 'Test project' },
          userCredentials: credentials,
        });

        const projectReadResponse = await authFactory.inject({
          method: 'GET',
          url: `/project/${oneProject.id}`,
          userCredentials: credentials,
        });

        const projectListReadResponse = await authFactory.inject({
          method: 'GET',
          url: '/project',
          userCredentials: credentials,
        });

        expect(projectCreateResponse.statusCode).toBe(403);
        expect(projectReadResponse.statusCode).toBe(403);
        expect(projectListReadResponse.statusCode).toBe(403);
      }

      {
        const { credentials } = await authFactory.createUserWithRole('admin');

        const projectCreateResponse = await authFactory.inject({
          method: 'POST',
          url: '/project',
          payload: { name: 'Test project 2' },
          userCredentials: credentials,
        });

        const projectReadResponse = await authFactory.inject({
          method: 'GET',
          url: `/project/${oneProject.id}`,
          userCredentials: credentials,
        });

        const projectListReadResponse = await authFactory.inject({
          method: 'GET',
          url: '/project',
          userCredentials: credentials,
        });

        expect(projectCreateResponse.statusCode).toBe(201);
        expect(projectReadResponse.statusCode).toBe(200);
        expect(projectListReadResponse.statusCode).toBe(200);
      }
    });
  });
});
