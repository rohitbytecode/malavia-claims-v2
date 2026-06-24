import { Document, Types } from "mongoose";
import { Roles } from "@/core/enums/roles.enum.js";

export interface UserBase {
  fullName: string;
  username: string;
  password: string;
  role: Roles;
  isActive: boolean;
  organizationId?: Types.ObjectId;
  refreshTokenHash?: string;
  refreshTokenHashes?: string[];
}

export interface UserDocument extends UserBase, Document {
  createdAt: Date;
  updatedAt: Date;
}

