import { describe, expect } from 'vitest';
import { test } from '../tests';

const PROJECT_NAME = 'test-project-name';

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
      payload: { name: PROJECT_NAME },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ name: PROJECT_NAME });
  });

  test('Cannot create project with the same name', async ({ server, authFactory }) => {
    await server.database.project.create({ data: { name: PROJECT_NAME } });

    const response = await authFactory.inject({
      url: '/project',
      method: 'POST',
      userRole: 'admin',
      payload: { name: PROJECT_NAME },
    });

    expect(response.statusCode).toBe(400);
  });
});
