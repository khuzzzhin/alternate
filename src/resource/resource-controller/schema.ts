import { type Static, Type as T } from '@sinclair/typebox';

export const resourceReadSchema = {
  params: T.Object({
    id: T.String({ minLength: 1 }),
  }),
  querystring: T.Object({
    include: T.Optional(T.String({ minLength: 1 })),
    relations: T.Optional(T.String({ minLength: 1 })),
  }),
};

export type ResourceReadSchema = {
  Params: Static<(typeof resourceReadSchema)['params']>;
  Querystring: Static<(typeof resourceReadSchema)['querystring']>;
};

export const resourceListReadSchema = {
  querystring: T.Object({
    collectionId: T.String({ minLength: 1 }),
    include: T.Optional(T.String({ minLength: 1 })),
    relations: T.Optional(T.String({ minLength: 1 })),
  }),
};

export type ResourceListReadSchema = {
  Querystring: Static<(typeof resourceListReadSchema)['querystring']>;
};

export const resourceCreateSchema = {
  body: T.Object({
    collectionId: T.String({ minLength: 1 }),
    payload: T.Object({}),
  }),
};

export type ResourceCreateSchema = {
  Body: Static<(typeof resourceCreateSchema)['body']>;
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

export type ResourceUpdateSchema = {
  Params: Static<(typeof resourceUpdateSchema)['params']>;
  Body: Static<(typeof resourceUpdateSchema)['body']>;
};
