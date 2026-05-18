import { describe, expect } from 'vitest';
import { test } from '../../tests';

describe('Project controller', () => {
  test('Only user with admin role is allowed to create/read projects', async ({ server, oneProject, authFactory }) => {
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
