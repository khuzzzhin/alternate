import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { PostgreSqlContainer } from '@testcontainers/postgresql';

async function runMigrations() {
  const command = `prisma db push --skip-generate`;
  const promisifiedExec = promisify(exec);
  const result = await promisifiedExec(command);
  console.info(result.stdout);
}

export default async function setup() {
  console.info('Database setup...');

  if (!process.env.DATABASE_IMAGE) throw Error('"DATABASE_IMAGE" environment variable is not set');

  const container = await new PostgreSqlContainer(process.env.DATABASE_IMAGE)
    .withDatabase(String(process.env.DATABASE_NAME))
    .withUsername(String(process.env.DATABASE_USER))
    .withPassword(String(process.env.DATABASE_PASSWORD))
    .withExposedPorts({
      container: Number(process.env.DATABASE_PORT),
      host: Number(process.env.DATABASE_PORT),
    })
    .start();

  console.info('Database container started');

  console.info('Run migrations...');

  await runMigrations();

  return async function teardown() {
    console.info('Database teardown...');

    await container.stop();

    console.info('Database container stopped');
  };
}
