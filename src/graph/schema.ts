import { type Static, Type as T } from '@sinclair/typebox';

const TNonEmptyString = () => T.String({ minLength: 1 });
const TObject = T.Object;

export const NODE_LIST_SCHEMA = {
  querystring: T.Object({
    label: TNonEmptyString(),
  }),
};

export type NodeListSchema = {
  Querystring: Static<(typeof NODE_LIST_SCHEMA)['querystring']>;
};

export const NODE_CREATE_SCHEMA = {
  body: T.Object({
    label: TNonEmptyString(),
    properties: TObject({}),
    relationships: T.Optional(T.Record(T.String(), T.Number())),
  }),
};

export type NodeCreateSchema = {
  Body: Static<(typeof NODE_CREATE_SCHEMA)['body']>;
};

export const NODE_UPDATE_SCHEMA = {
  params: T.Object({
    id: TNonEmptyString(),
  }),
  body: T.Object({
    properties: TObject({}),
  }),
};

export type NodeUpdateSchema = {
  Params: Static<(typeof NODE_UPDATE_SCHEMA)['params']>;
  Body: Static<(typeof NODE_UPDATE_SCHEMA)['body']>;
};

export const NODE_DELETE_SCHEMA = {
  params: T.Object({
    id: TNonEmptyString(),
  }),
};

export type NodeDeleteSchema = {
  Params: Static<(typeof NODE_DELETE_SCHEMA)['params']>;
};

export const LABEL_CREATE_SCHEMA = {
  body: T.Object({
    name: TNonEmptyString(),
  }),
};

export type LabelCreateSchema = {
  Body: Static<(typeof LABEL_CREATE_SCHEMA)['body']>;
};

export const LABEL_DELETE_SCHEMA = {
  params: T.Object({
    label: TNonEmptyString(),
  }),
};

export type LabelDeleteSchema = {
  Params: Static<(typeof LABEL_DELETE_SCHEMA)['params']>;
};

export const LABEL_READ_SCHEMA = {
  params: T.Object({
    name: TNonEmptyString(),
  }),
};

export type LabelReadSchema = {
  Params: Static<(typeof LABEL_READ_SCHEMA)['params']>;
};
