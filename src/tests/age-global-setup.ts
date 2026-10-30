import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';
import type { TestProject } from 'vitest/node';

async function initializeAgeDatabase(container: StartedTestContainer) {
  const initCommands = `
    CREATE EXTENSION IF NOT EXISTS age;
    LOAD 'age';
    SET search_path = ag_catalog, "$user", public;
    SELECT create_graph('test_graph');
  `;

  const result = await container.exec(['psql', '-U', 'postgres', '-d', 'postgres', '-c', initCommands]);

  if (result.exitCode !== 0) {
    console.error('Failed to initialize AGE:', result.stderr);
    throw new Error('AGE initialization failed');
  }

  console.info('AGE extension and graph created successfully');
}

export default async function setup({ provide }: TestProject) {
  console.info('Age setup...');

  const container = await new GenericContainer('apache/age:latest')
    .withExposedPorts({
      container: 5432,
      host: 5433,
    })
    .withEnvironment({
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'postgres',
      POSTGRES_DB: 'postgres',
    })
    .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
    .start();

  console.info('Age container started');

  // Wait age extension to be created
  await new Promise((r) => setTimeout(r, 3000));

  // Execute initial SQL commands
  await initializeAgeDatabase(container);

  return async function teardown() {
    console.info('Age teardown...');

    await container.stop();

    console.info('Age container stopped');
  };
}
