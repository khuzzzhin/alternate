import { type Static, Type as T } from '@sinclair/typebox';

export const projectReadSchema = {
  params: T.Object({
    id: T.String({ minLength: 1 }),
  }),
};

export type ProjectReadSchema = {
  Params: Static<(typeof projectReadSchema)['params']>;
};

export const projectCreateSchema = {
  body: T.Object({
    name: T.String({ minLength: 1 }),
  }),
};

export type ProjectCreateSchema = {
  Body: Static<(typeof projectCreateSchema)['body']>;
};
