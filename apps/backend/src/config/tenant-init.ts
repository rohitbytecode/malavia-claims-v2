import mongoose from "mongoose";
import { tenantScopePlugin } from "../core/tenant/tenant-plugin.js";

// Register tenant scoping plugin globally for all Mongoose schemas
mongoose.plugin(tenantScopePlugin);
console.log("🔒 Multi-tenant Mongoose query plugin registered globally");
