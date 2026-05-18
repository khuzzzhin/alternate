import { Prisma } from '@prisma/client';
import type { FastifyPluginAsync } from 'fastify';
import { type ProjectCreateSchema, type ProjectReadSchema, projectCreateSchema, projectReadSchema } from './schema.js';

export const projectController: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error, request, reply) => {
    const DEFAULT_STATUS_CODE = 500;

    const statusCodeByPrismaErrorCode: Record<string, number | undefined> = {
      P2002: 400,
    };

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const statusCode = statusCodeByPrismaErrorCode[error.code] || DEFAULT_STATUS_CODE;

      return reply.code(statusCode).send(error.message);
    }

    throw error;
  });

  fastify.route<ProjectReadSchema>({
    method: 'GET',
    url: '/project/:id',
    schema: projectReadSchema,
    onRequest: async (request, reply) => {
      const canReadProjects = request.session?.user.role === 'admin';

      if (!canReadProjects) {
        return reply
          .code(403)
          .send({ code: 'NOT_ALLOWED_TO_READ_PROJECTS', message: 'You are not allowed to read projects' });
      }
    },
    handler: async (request) => {
      return await fastify.database.project.findUniqueOrThrow({
        where: { id: request.params.id },
      });
    },
  });

  fastify.route({
    method: 'GET',
    url: '/project',
    onRequest: async (request, reply) => {
      const canReadProjects = request.session?.user.role === 'admin';

      if (!canReadProjects) {
        return reply
          .code(403)
          .send({ code: 'NOT_ALLOWED_TO_READ_PROJECTS', message: 'You are not allowed to read projects' });
      }
    },
    handler: async () => {
      return await fastify.database.project.findMany();
    },
  });

  fastify.route<ProjectCreateSchema>({
    method: 'POST',
    url: '/project',
    schema: projectCreateSchema,
    onRequest: async (request, reply) => {
      const canCreateProject = request.session?.user.role === 'admin';

      if (!canCreateProject) {
        return reply
          .code(403)
          .send({ code: 'NOT_ALLOWED_TO_CREATE_PROJECTS', message: 'You are not allowed to create projects' });
      }
    },
    handler: async (request, reply) => {
      const createdProject = await fastify.database.project.create({
        data: { name: request.body.name },
      });

      return reply.code(201).send(createdProject);
    },
  });
};
