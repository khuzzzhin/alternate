import cors from '@fastify/cors';
import Fastify, { type FastifyServerOptions } from 'fastify';
import { authentication } from './authentication/index.js';
import { collection } from './collection/index.js';
import { type DatabaseOptions, database } from './database/index.js';
import { minio } from './minio/index.js';
import { project } from './project/index.js';
import { resource } from './resource/index.js';
import { storage } from './storage/index.js';

interface Options {
  serverOptions?: FastifyServerOptions;
  databaseOptions: DatabaseOptions;
  minioOptions: {
    host: string;
    port: number;
    accessKey: string;
    secretKey: string;
    useSSL: boolean;
    bucketName: string;
  };
}

export const buildServer = (options: Options) => {
  const { serverOptions, databaseOptions, minioOptions } = options;

  const fastifyServer = Fastify(serverOptions);

  fastifyServer.register(cors, {
    origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || false,
    methods: 'GET,HEAD,POST,PATCH,PUT,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400,
  });

  fastifyServer.register(database, databaseOptions);
  fastifyServer.register(authentication);
  fastifyServer.register(minio, minioOptions);

  fastifyServer.register(project);
  fastifyServer.register(collection);
  fastifyServer.register(resource);
  fastifyServer.register(storage);

  return fastifyServer;
};
