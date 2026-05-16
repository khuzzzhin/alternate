import { describe, expect } from 'vitest';
import { test } from '../tests';

describe('Authentication', () => {
  test('Sign up using email and password', async ({ server }) => {
    const newUserData = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      password: 'password1234',
    };

    const response = await server.inject({
      method: 'POST',
      url: `/auth/sign-up/email`,
      body: newUserData,
    });

    const responseBody = response.json();

    expect(response.statusCode).toBe(200);
    expect(responseBody).toHaveProperty('user');
    expect(responseBody.user).toMatchObject({
      name: newUserData.name,
      email: newUserData.email,
    });
  });

  test.todo('Sign in');
  test.todo('Sign out');
});
