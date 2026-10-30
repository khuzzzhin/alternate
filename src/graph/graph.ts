import { Ajv } from 'ajv';
import addFormats from 'ajv-formats';
import type { FastifyPluginAsync } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import {
  LABEL_CREATE_SCHEMA,
  LABEL_DELETE_SCHEMA,
  LABEL_READ_SCHEMA,
  type LabelCreateSchema,
  type LabelDeleteSchema,
  type LabelReadSchema,
  NODE_CREATE_SCHEMA,
  NODE_DELETE_SCHEMA,
  NODE_LIST_SCHEMA,
  NODE_UPDATE_SCHEMA,
  type NodeCreateSchema,
  type NodeDeleteSchema,
  type NodeListSchema,
  type NodeUpdateSchema,
} from './schema.js';
import { stringifyNodePropertiesToCreate, stringifyNodePropertiesToUpdate } from './utils/index.js';

interface LabelSettings {
  schema?: {
    required?: string[];
    properties: Record<string, unknown>;
    relationships?: Record<string, { type: 'number'; label: string }>;
  };
}

interface NodeRelationship {
  key: string;
  properties: Record<string, unknown>;
  target: unknown;
}

interface NodeRelationshipMap {
  [key: NodeRelationship['key']]: NodeRelationship;
}

interface Node {
  id: number;
  label: string;
  properties: Record<string, unknown>;
  relationships: NodeRelationship[];
}

const graph: FastifyPluginAsync = async (fastify) => {
  const ajv = new Ajv({ keywords: ['relationships', 'label', 'meta'] });
  addFormats.default(ajv);

  fastify.route<NodeCreateSchema>({
    method: 'POST',
    url: '/graph/node',
    schema: NODE_CREATE_SCHEMA,
    handler: async (request, reply) => {
      const label = request.body.label;
      const properties = request.body.properties;
      const relationships = request.body.relationships || {};
      const timestamp = new Date().toISOString();

      const [, [labelSettings]] = await fastify.database.$transaction([
        fastify.database.$queryRaw`SET search_path = ag_catalog, "$user", public;`,
        fastify.database.$queryRawUnsafe<LabelSettings[]>(`
          SELECT node->'settings'->'schema' as schema FROM cypher('alternate_graph', $$
            MATCH (node:_label_settings { label: '${label}' })

            RETURN properties(node)
          $$) as (node json);              
      `),
      ]);

      const schema = labelSettings?.schema;

      if (schema) {
        const propertiesSchema = {
          ...schema,
          properties: schema.properties,
          required: schema.required?.filter((property) => property in schema.properties),
        };
        const validateProperties = ajv.compile(propertiesSchema);
        if (!validateProperties(properties)) throw validateProperties.errors;

        if (schema.relationships) {
          const relationshipProperties = schema.relationships;

          const relationshipsSchema = {
            ...schema,
            properties: relationshipProperties,
            required: schema.required?.filter((property) => property in relationshipProperties),
          };

          const validateRelationships = ajv.compile(relationshipsSchema);
          if (!validateRelationships(relationships)) throw validateRelationships.errors;
        }
      }

      const relationshipClause = schema?.relationships
        ? Object.entries(schema.relationships).reduce(
            (acc, [key, schema], index) => {
              const value = relationships[key];

              acc.MATCH += `MATCH (${key}:${schema.label}) WHERE id(${key}) = ${value}\n`;
              // acc.WITH += `WITH ${key}, CASE WHEN ${key} IS NULL THEN 'ERROR: Node with ID ${value} does not exist' END AS error_msg\n`;
              acc.CREATE += `CREATE (node)-[:${key}]->(${key})\n`;

              return acc;
            },
            { MATCH: '', WITH: '', CREATE: '' },
          )
        : { MATCH: '', WITH: '', CREATE: '' };

      const query = `
        SELECT * FROM cypher('alternate_graph', $$
          MATCH (user:user)
          ${relationshipClause.MATCH}
          ${relationshipClause.WITH}
          CREATE (node:${label} ${stringifyNodePropertiesToCreate(properties)})
          CREATE (node)-[edge:created_by]->(user)
          ${relationshipClause.CREATE}
          SET node.created_at = '${timestamp}'

          RETURN node
        $$) as (node json);        
      `;

      const [, result] = await fastify.database.$transaction([
        fastify.database.$queryRaw`SET search_path = ag_catalog, "$user", public;`,
        fastify.database.$queryRawUnsafe<unknown[]>(query),
      ]);

      if (!result.length) {
        return reply
          .code(400)
          .send(Error('Failed to create node. Check the correctness of properties or relationships in your input'));
      }

      return reply.code(201).send(result);
    },
  });

  fastify.route<NodeUpdateSchema>({
    method: 'PATCH',
    url: '/graph/node/:id',
    schema: NODE_UPDATE_SCHEMA,
    handler: async (request, reply) => {
      const nodeId = request.params.id;
      const properties = request.body.properties;

      const timestamp = new Date().toISOString();

      const query = `
        SELECT * FROM cypher('alternate_graph', $$
          MATCH (node)
          WHERE id(node) = ${nodeId}
          SET ${stringifyNodePropertiesToUpdate(properties)}
          SET node.updated_at = '${timestamp}'
          RETURN node
        $$) as (node json);        
      `;

      const [, result] = await fastify.database.$transaction([
        fastify.database.$queryRaw`SET search_path = ag_catalog, "$user", public;`,
        fastify.database.$queryRawUnsafe(query),
      ]);

      return result;
    },
  });

  fastify.route<NodeDeleteSchema>({
    method: 'DELETE',
    url: '/graph/node/:id',
    schema: NODE_DELETE_SCHEMA,
    handler: async (request, reply) => {
      const nodeId = request.params.id;

      const query = `
        SELECT * FROM cypher('alternate_graph', $$
          MATCH (node)
          WHERE id(node) = ${nodeId}
          DETACH DELETE node
          RETURN null
        $$) as (node json);        
      `;

      const [, result] = await fastify.database.$transaction([
        fastify.database.$queryRaw`SET search_path = ag_catalog, "$user", public;`,
        fastify.database.$queryRawUnsafe(query),
      ]);

      return reply.code(204).send(result);
    },
  });

  fastify.route<NodeListSchema>({
    method: 'GET',
    url: '/graph/node',
    schema: NODE_LIST_SCHEMA,
    handler: async (request) => {
      const label = request.query.label;

      const query = `
        SELECT node->'id' id, node->'label' label, node->'properties' properties, node->'relationships' relationships
        FROM cypher('alternate_graph', $$
        MATCH (node:${label})
        OPTIONAL MATCH (node)-[edge]->(target)

        WITH node, collect(CASE WHEN edge IS NOT NULL THEN {
            key: type(edge),
            properties: properties(edge),
            target: target
        } END) as relationships

        RETURN {
          id: id(node),
          label: label(node),
          properties: properties(node),
          relationships: relationships
        }
        $$) as (node json);
      `;

      const [, nodes] = await fastify.database.$transaction([
        fastify.database.$queryRaw`SET search_path = ag_catalog, "$user", public;`,
        fastify.database.$queryRawUnsafe<Node[]>(query),
      ]);

      return nodes.map((node) => {
        return {
          ...node,
          relationships: node.relationships.reduce<NodeRelationshipMap>((acc, relationship) => {
            acc[relationship.key] = relationship;
            return acc;
          }, {}),
        };
      });
    },
  });

  fastify.route({
    method: 'GET',
    url: '/graph/label',
    handler: async () => {
      const query = `
        SELECT l.id, l.name, graph_query.settings
        FROM ag_catalog.ag_label AS l
        LEFT JOIN cypher('alternate_graph', $$
                MATCH (node:_label_settings)
                RETURN node.label, node.settings
        $$) AS graph_query(label text, settings json)
        ON l.name = graph_query.label
        WHERE kind = 'v' AND name != '_ag_label_vertex'
      `;

      const [, result] = await fastify.database.$transaction([
        fastify.database.$queryRaw`SET search_path = ag_catalog, "$user", public;`,
        fastify.database.$queryRawUnsafe(query),
      ]);

      return await result;
    },
  });

  fastify.route<LabelCreateSchema>({
    method: 'POST',
    url: '/graph/label',
    schema: LABEL_CREATE_SCHEMA,
    handler: async (request, reply) => {
      const query = `SELECT ag_catalog.create_vlabel('alternate_graph', '${request.body.name}')::text;`;

      await fastify.database.$transaction([
        fastify.database.$queryRaw`SET search_path = ag_catalog, "$user", public;`,
        fastify.database.$queryRawUnsafe(query),
      ]);

      return reply.code(201).send(null);
    },
  });

  fastify.route<LabelReadSchema>({
    method: 'GET',
    url: '/graph/label/:name',
    schema: LABEL_READ_SCHEMA,
    handler: async (request, reply) => {
      const labelName = request.params.name;

      const query = `
        SELECT l.id, l.name, graph_query.settings
        FROM ag_catalog.ag_label AS l
        LEFT JOIN cypher('alternate_graph', $$
                MATCH (node:_label_settings)
                RETURN node.label, node.settings
        $$) AS graph_query(label text, settings json)
        ON l.name = graph_query.label
        WHERE kind = 'v' AND name = '${labelName}'
      `;

      const [, result] = await fastify.database.$transaction([
        fastify.database.$queryRaw`SET search_path = ag_catalog, "$user", public;`,
        fastify.database.$queryRawUnsafe<unknown[]>(query),
      ]);

      const label = result.at(0);

      if (!label) return reply.code(404).send(null);

      return label;
    },
  });

  fastify.route<LabelDeleteSchema>({
    method: 'DELETE',
    url: '/graph/label/:label',
    schema: LABEL_DELETE_SCHEMA,
    handler: async (request, reply) => {
      const label = request.params.label;

      const query = `SELECT drop_label('alternate_graph','${label}')::text;`;

      const [, result] = await fastify.database.$transaction([
        fastify.database.$queryRaw`SET search_path = ag_catalog, "$user", public;`,
        fastify.database.$queryRawUnsafe(query),
      ]);

      return reply.code(204).send(result);
    },
  });

  fastify.route<{ Body: { query: string } }>({
    method: 'POST',
    url: '/graph',
    handler: async (request, reply) => {
      const [, result] = await fastify.database.$transaction([
        fastify.database.$queryRaw`SET search_path = ag_catalog, "$user", public;`,
        fastify.database.$queryRawUnsafe(request.body.query),
      ]);

      return result;
    },
  });
};

export default fastifyPlugin(graph);
