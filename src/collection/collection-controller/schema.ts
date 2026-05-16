import { type Static, Type as T } from '@sinclair/typebox';

export const collectionReadSchema = {
  params: T.Object({
    id: T.String({ minLength: 1 }),
  }),
};

export type CollectionReadSchema = {
  Params: Static<(typeof collectionReadSchema)['params']>;
};

export const collectionListReadSchema = {
  querystring: T.Object({
    projectId: T.String({ minLength: 1 }),
  }),
};

export type CollectionListReadSchema = {
  Querystring: Static<(typeof collectionListReadSchema)['querystring']>;
};

export const collectionCreateSchema = {
  body: T.Object({
    projectId: T.String({ minLength: 1 }),
    name: T.String({ minLength: 1 }),
  }),
};

export type CollectionCreateSchema = {
  Body: Static<(typeof collectionCreateSchema)['body']>;
};

export const collectionUpdateSchema = {
  params: T.Object({
    id: T.String({ minLength: 1 }),
  }),
  body: T.Object(
    {
      name: T.Optional(T.String({ minLength: 1 })),
      schema: T.Optional(T.Object({})),
    },
    { additionalProperties: false },
  ),
};

export type CollectionUpdateSchema = {
  Params: Static<(typeof collectionUpdateSchema)['params']>;
  Body: Static<(typeof collectionUpdateSchema)['body']>;
};
