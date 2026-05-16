import { PrismaClient } from '@prisma/client';
import { objectExtension } from './extensions/index.js';

export function createExtendedPrismaClient() {
  return new PrismaClient().$extends(objectExtension);
}
