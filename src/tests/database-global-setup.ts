import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';

async function runMigrations(url: string) {
  const command = `export DATABASE_URL="${url}" && prisma db push --skip-generate`;
  const result = await promisify(exec)(command);
  console.info(result.stdout);
}

export default async function setup({ provide }: TestProject) {
  console.info('Database setup...');

  if (!process.env.DATABASE_IMAGE) throw Error('"DATABASE_IMAGE" environment variable is not set');

  const DATABASE_PORT = 5432;
  const DATABASE_IMAGE = process.env.DATABASE_IMAGE;

  const container = await new PostgreSqlContainer(DATABASE_IMAGE).withExposedPorts(DATABASE_PORT).start();

  console.info('Database container started');

  const url = container.getConnectionUri();

  provide('DATABASE_URL', url);

  console.info('Run migrations...');

  await runMigrations(url);

  return async function teardown() {
    console.info('Database teardown...');

    await container.stop();

    console.info('Database container stopped');
  };
}
