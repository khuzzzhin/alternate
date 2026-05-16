import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyPluginAsync } from 'fastify';
import fastifyPlugin from 'fastify-plugin';

const authentication: FastifyPluginAsync = async (fastify) => {
  const auth = betterAuth({
    database: prismaAdapter(fastify.database, { provider: 'postgresql' }),
    emailAndPassword: { enabled: true },
    trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(','),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    basePath: '/auth',
    advanced: { useSecureCookies: process.env.BETTER_AUTH_USE_SECURE_COOKIES === 'false' ? false : undefined },
  });

  fastify.route({
    method: ['GET', 'POST'],
    url: '/auth/*',
    /**
     * Copy-pasted from https://better-auth.com/docs/integrations/fastify
     */
    async handler(request, reply) {
      try {
        // Construct request URL
        const url = new URL(request.url, `http://${request.headers.host}`);

        // Convert Fastify headers to standard Headers object
        const headers = fromNodeHeaders(request.headers);
        // Create Fetch API-compatible request
        const req = new Request(url.toString(), {
          method: request.method,
          headers,
          ...(request.body ? { body: JSON.stringify(request.body) } : {}),
        });
        // Process authentication request
        const response = await auth.handler(req);
        // Forward response to client
        reply.status(response.status);
        response.headers.forEach((value, key) => {
          reply.header(key, value);
        });
        return reply.send(response.body ? await response.text() : null);
      } catch (error) {
        console.error('Authentication Error:', error);
        return reply.status(500).send({
          error: 'Internal authentication error',
          code: 'AUTH_FAILURE',
        });
      }
    },
  });
};

export default fastifyPlugin(authentication);
