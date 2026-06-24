import { Schema, Types } from "mongoose";
import { getTenantId } from "./tenant-context.js";

export function tenantScopePlugin(schema: Schema) {
  // If the schema doesn't define organizationId, do not apply tenant scoping.
  if (!schema.paths.organizationId) {
    return;
  }

  // Pre-query hook to automatically inject organizationId filter
  const applyTenantFilter = function (this: any) {
    const orgId = getTenantId();
    if (!orgId) return;

    const query = this.getQuery();

    // If query explicitly sets/bypasses organizationId, respect it
    if (query && query.organizationId !== undefined) {
      return;
    }

    this.where({ organizationId: orgId });
  };

  const queryMethods = [
    "find",
    "findOne",
    "count",
    "countDocuments",
    "estimatedDocumentCount",
    "updateOne",
    "updateMany",
    "findOneAndUpdate",
    "findOneAndDelete",
    "findOneAndReplace",
    "deleteOne",
    "deleteMany",
  ];

  queryMethods.forEach((method) => {
    schema.pre(method as any, applyTenantFilter);
  });

  // Pre-aggregate hook to automatically inject organizationId filter in pipelines
  schema.pre("aggregate", function (this: any) {
    const orgId = getTenantId();
    if (!orgId) return;

    const pipeline = this.pipeline();

    // Check if the first stage already matches organizationId
    const firstStage = pipeline[0];
    if (firstStage && firstStage.$match && firstStage.$match.organizationId !== undefined) {
      return;
    }

    pipeline.unshift({
      $match: { organizationId: new Types.ObjectId(orgId) },
    });
  });

  // Pre-validate hook to automatically set organizationId on document creation/saving
  schema.pre("validate", function (this: any) {
    const orgId = getTenantId();
    if (orgId && !this.get("organizationId")) {
      this.set("organizationId", orgId);
    }
  });
}
