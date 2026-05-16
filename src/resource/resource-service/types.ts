import type {
  Resource as DatabaseResource,
  ResourceWithObjects as DatabaseResourceWithObjects,
  ResourceWithOutgoingRelations as DatabaseResourceWithOutgoingRelations,
  ResourceWhereInput,
} from '../../database/types.js';
import type { Object } from '../../storage/object-service/types.js';

interface ResourceReadParams {
  resourceId: Resource['id'];
  include?: { objects: boolean };
  relations?: string[];
}

interface ResourceListReadParams {
  collectionId: string;
  where?: ResourceWhereInput;
  include?: { objects: boolean };
  relations?: string[];
}

export interface ResourceTransformParams {
  resource: DatabaseResource | DatabaseResourceWithObjects | DatabaseResourceWithOutgoingRelations;
}

export interface ResourceRelationsTransformParams extends ResourceTransformParams {}

export interface ResourceService {
  transformResource: (params: ResourceTransformParams) => Promise<Resource>;

  readResource: (params: ResourceReadParams) => Promise<Resource>;
  readResourceList: (params: ResourceListReadParams) => Promise<Resource[]>;
  createResource: (data: Pick<Resource, 'collectionId' | 'payload'>) => Promise<DatabaseResource>;
  updateResource: (resourceId: Resource['id'], data: Pick<Resource, 'payload'>) => Promise<DatabaseResource>;
}

export interface Resource extends DatabaseResource {
  objects?: Object[];
  relations?: Record<keyof Resource['payload'], Resource | null>;
}
