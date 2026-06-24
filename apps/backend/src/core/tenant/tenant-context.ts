import { AsyncLocalStorage } from "node:async_hooks";

export interface TenantContext {
  organizationId?: string;
  userId?: string;
  role?: string;
  bypassTenant?: boolean;
}

export const tenantLocalStorage = new AsyncLocalStorage<TenantContext>();

export const getTenantId = (): string | undefined => {
  const store = tenantLocalStorage.getStore();
  if (store?.bypassTenant) return undefined;
  return store?.organizationId;
};

export const getTenantContext = (): TenantContext | undefined => {
  return tenantLocalStorage.getStore();
};
