import { PrismaClient } from '@prisma/client';
import { objectExtension } from './extensions/index.js';
import type { DatabaseOptions } from './types.js';

export function createExtendedPrismaClient(options: DatabaseOptions) {
  return new PrismaClient({ datasourceUrl: options.url }).$extends(objectExtension);
}
