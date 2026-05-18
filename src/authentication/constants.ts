import { createAccessControl } from 'better-auth/plugins/access';
import { adminAc as adminAccessControl, defaultStatements } from 'better-auth/plugins/admin/access';

const STATEMENT = {
  ...defaultStatements,
  project: ['create', 'list', 'update', 'delete'],
  collection: ['create', 'list', 'update', 'delete'],
  resource: ['create', 'list', 'update', 'delete'],
} as const;

export const ACCESS_CONTROL = createAccessControl(STATEMENT);

export const ROLES = {
  admin: ACCESS_CONTROL.newRole({
    ...adminAccessControl.statements,
    project: ['create', 'list', 'update', 'delete'],
    collection: ['create', 'list', 'update', 'delete'],
    resource: ['create', 'list', 'update', 'delete'],
  }),
  user: ACCESS_CONTROL.newRole({
    resource: ['create', 'list', 'update', 'delete'],
  }),
} as const;
