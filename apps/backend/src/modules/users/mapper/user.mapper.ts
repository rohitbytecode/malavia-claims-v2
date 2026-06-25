import { UserDocument } from "@/modules/users/types/user.types.js";

export const toUserResponse = (user: Partial<UserDocument>) => {
  return {
    id: user._id?.toString() ?? null,
    fullName: user.fullName,
    username: (user as any).username,
    role: user.role,
    isActive: user.isActive,
    organizationId: user.organizationId?.toString() ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};
