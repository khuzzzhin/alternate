import type { Object as BaseObject, Collection, Prisma, Resource } from '@prisma/client';
import type { createExtendedPrismaClient } from './utils.js';

export type PrismaClientExtended = ReturnType<typeof createExtendedPrismaClient>;

export type { Collection, Resource };

export interface Object extends BaseObject {
  name: string;
}

export type ResourceWhereInput = Prisma.ResourceWhereInput;

export interface ResourceWithObjects extends Resource {
  objects: Object[];
}

const resourceWithOutgoingRelations = {
  include: { outgoingRelations: { include: { targetResource: true } } },
} satisfies Prisma.ResourceDefaultArgs;

export type ResourceWithOutgoingRelations = Prisma.ResourceGetPayload<typeof resourceWithOutgoingRelations>;
