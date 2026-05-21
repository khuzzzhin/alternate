import type { Collection, Prisma, Project, Resource } from '@prisma/client';
import type { UserWithRole } from 'better-auth/plugins/admin';
import type { FastifyInstance, InjectOptions, LightMyRequestResponse } from 'fastify';
import type { Client as MinioClient } from 'minio';
import type { Object } from '../database/types.js';

interface TestUtils {
  inspect: (object: unknown, showHidden?: boolean, depth?: number) => void;
}

interface File {
  name: string;
  content: Blob | string;
}

interface UserCredentials {
  email: string;
  password: string;
}

type InjectWithUserOptions = InjectOptions & ({ userRole: 'user' | 'admin' } | { userCredentials: UserCredentials });

export interface Fixtures {
  server: FastifyInstance;

  oneProject: Project;
  manyProjects: Project[];

  oneCollection: Collection;
  manyCollections: Collection[];
  collectionFactory: {
    /**
     * Creates and returns a new collection
     * @param data - Collection data, defaults to fixture data
     * @returns The created collection
     */
    createCollection: (data?: Prisma.CollectionCreateInput) => Promise<Collection>;
  };

  oneResource: Resource;
  manyResources: Resource[];
  resourceFactory: {
    /**
     * Creates a new resource in the specified collection
     * @param collection - The collection to create the resource in
     * @param payload - Resource payload. Defaults to fixture payload
     * @returns The created resource
     */
    createResource: (collection: Collection, payload?: Resource['payload']) => Promise<Resource>;
  };

  minioClient: MinioClient;
  bucketName: string;
  oneFile: File;
  oneObject: Object;

  objectFactory: {
    /**
     * Creates a new object using the `oneFile` fixture for the specified resource
     * @param resource - The resource to create the object in
     * @returns The created object
     */
    createObject: (resource: Resource) => Promise<Object>;
  };

  authFactory: {
    /**
     * Creates a new user with the specified role
     * @param role - The role to assign to the user ('user' or 'admin')
     * @returns The created user object and their credentials
     */
    createUserWithRole: (role: 'user' | 'admin') => Promise<{ user: UserWithRole; credentials: UserCredentials }>;

    /**
     * Signs in a user and returns authentication headers
     * @param userCredentials - The user's email and password
     * @returns Authentication headers containing cookie/session data
     */
    signIn: (userCredentials: UserCredentials) => Promise<{ Cookie: string | undefined }>;

    /**
     * The same as `server.inject`, but allows to provide user credentials
     * that will be used to authenticate and make a request. Instead of credentials
     * user role can be provided to create a new user before proceeding to authentication.
     *
     * @TODO User creation/authentication on every request is slow.
     */
    inject: (options: InjectWithUserOptions) => Promise<LightMyRequestResponse>;
  };

  utils: TestUtils;
}
