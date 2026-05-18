import type { AuthInstance } from './authentication.js';

declare module 'fastify' {
  interface FastifyInstance {
    auth: AuthInstance;
  }
  interface FastifyRequest {
    session: Awaited<ReturnType<AuthInstance['api']['getSession']>>;
  }
}

export { default as authentication } from './authentication.js';
