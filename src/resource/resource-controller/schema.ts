import { Type as T } from '@sinclair/typebox';

export const resourceReadSchema = {
  params: T.Object({
    id: T.String({ minLength: 1 }),
  }),
  querystring: T.Object({
    include: T.Optional(T.String({ minLength: 1 })),
    relations: T.Optional(T.String({ minLength: 1 })),
  }),
};

export const resourceListReadSchema = {
  querystring: T.Object({
    collectionId: T.String({ minLength: 1 }),
    include: T.Optional(T.String({ minLength: 1 })),
    relations: T.Optional(T.String({ minLength: 1 })),
  }),
};

export const resourceCreateSchema = {
  body: T.Object({
    collectionId: T.String({ minLength: 1 }),
    payload: T.Object({}),
  }),
};

export const resourceUpdateSchema = {
  params: T.Object({
    id: T.String({ minLength: 1 }),
  }),
  body: T.Object(
    {
      payload: T.Object({}),
    },
    { additionalProperties: false },
  ),
};
