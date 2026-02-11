import * as accessKeysAssign from './access-keys/assign.js';
import * as accessKeysCreate from './access-keys/create.js';
import * as accessKeysDelete from './access-keys/delete.js';
import * as accessKeysGet from './access-keys/get.js';
import * as accessKeysList from './access-keys/list.js';
import * as bucketsCreate from './buckets/create.js';
import * as bucketsDelete from './buckets/delete.js';
import * as bucketsGet from './buckets/get.js';
import * as bucketsList from './buckets/list.js';
import * as bucketsSet from './buckets/set.js';
import * as configure from './configure/index.js';
import * as cp from './cp.js';
import * as credentialsTest from './credentials/test.js';
import * as forksCreate from './forks/create.js';
import * as forksList from './forks/list.js';
import * as iamPoliciesCreate from './iam/policies/create.js';
import * as iamPoliciesDelete from './iam/policies/delete.js';
import * as iamPoliciesEdit from './iam/policies/edit.js';
import * as iamPoliciesGet from './iam/policies/get.js';
import * as iamPoliciesList from './iam/policies/list.js';
import * as loginCredentials from './login/credentials.js';
import * as loginOauth from './login/oauth.js';
import * as loginSelect from './login/select.js';
import * as logout from './logout.js';
import * as ls from './ls.js';
import * as mk from './mk.js';
import * as mv from './mv.js';
import * as objectsDelete from './objects/delete.js';
import * as objectsGet from './objects/get.js';
import * as objectsList from './objects/list.js';
import * as objectsPut from './objects/put.js';
import * as objectsSet from './objects/set.js';
import * as organizationsCreate from './organizations/create.js';
import * as organizationsList from './organizations/list.js';
import * as organizationsSelect from './organizations/select.js';
import * as rm from './rm.js';
import * as snapshotsList from './snapshots/list.js';
import * as snapshotsTake from './snapshots/take.js';
import * as stat from './stat.js';
import * as touch from './touch.js';
import * as whoami from './whoami.js';

type CommandModule = Record<string, unknown>;

const registry: Record<string, CommandModule> = {
  'access-keys.assign': accessKeysAssign,
  'access-keys.create': accessKeysCreate,
  'access-keys.delete': accessKeysDelete,
  'access-keys.get': accessKeysGet,
  'access-keys.list': accessKeysList,
  'buckets.create': bucketsCreate,
  'buckets.delete': bucketsDelete,
  'buckets.get': bucketsGet,
  'buckets.list': bucketsList,
  'buckets.set': bucketsSet,
  configure,
  cp,
  'credentials.test': credentialsTest,
  'forks.create': forksCreate,
  'forks.list': forksList,
  'iam.policies.list': iamPoliciesList,
  'iam.policies.get': iamPoliciesGet,
  'iam.policies.create': iamPoliciesCreate,
  'iam.policies.edit': iamPoliciesEdit,
  'iam.policies.delete': iamPoliciesDelete,
  'login.credentials': loginCredentials,
  'login.oauth': loginOauth,
  'login.select': loginSelect,
  logout,
  ls,
  mk,
  mv,
  'objects.delete': objectsDelete,
  'objects.get': objectsGet,
  'objects.list': objectsList,
  'objects.put': objectsPut,
  'objects.set': objectsSet,
  'organizations.create': organizationsCreate,
  'organizations.list': organizationsList,
  'organizations.select': organizationsSelect,
  rm,
  'snapshots.list': snapshotsList,
  'snapshots.take': snapshotsTake,
  stat,
  touch,
  whoami,
};

export function getModule(
  commandName: string,
  operationName?: string
): CommandModule | null {
  const key = operationName ? `${commandName}.${operationName}` : commandName;
  return registry[key] ?? null;
}

export function hasModule(
  commandName: string,
  operationName?: string
): boolean {
  return getModule(commandName, operationName) !== null;
}
