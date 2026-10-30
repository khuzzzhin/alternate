import { exec } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';

const AGE_MIGRATION_FILE = 'prisma/migrations/20260521172919_load_apache_age_extension_and_create_graph/migration.sql';

async function runMigrations(container: StartedPostgreSqlContainer) {
  const user = container.getUsername();
  const password = container.getPassword();
  const url = container.getConnectionUri();

  {
    const command = `export DATABASE_URL="${url}" && prisma db push --skip-generate`;
    const result = await promisify(exec)(command);

    console.info(result.stdout);
  }

  {
    const migrationFile = path.join(process.cwd(), AGE_MIGRATION_FILE);
    const sql = await fs.readFile(migrationFile, 'utf-8');

    const result = await container.exec(['psql', '-U', user, '-d', password, '-c', sql]);

    if (result.exitCode !== 0) throw new Error(result.stderr);

    console.info(result.output);
  }
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

  await runMigrations(container);

  return async function teardown() {
    console.info('Database teardown...');

    await container.stop();

    console.info('Database container stopped');
  };
}
