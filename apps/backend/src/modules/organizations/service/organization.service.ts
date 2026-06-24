import { OrganizationRepository } from "@/modules/organizations/repository/organization.repository.js";
import { UserRepository } from "@/modules/users/repository/user.repository.js";
import { hashPassword } from "@/modules/auth/utils/password.util.js";
import {
  signAccessToken,
  signRefreshToken,
} from "@/modules/auth/utils/jwt.util.js";
import { AppError } from "@/core/errors/AppError.js";
import { Roles } from "@/core/enums/roles.enum.js";
import { toUserResponse } from "@/modules/users/mapper/user.mapper.js";

interface RegisterPayload {
  organizationName: string;
  adminFullName: string;
  adminUsername: string;
  adminPassword: string;
  adminEmail?: string;
  plan?: string;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export class OrganizationService {
  static async register(payload: RegisterPayload) {
    let slug = generateSlug(payload.organizationName);

    // Ensure slug uniqueness
    let attempt = 0;
    while (await OrganizationRepository.slugExists(slug)) {
      attempt++;
      slug = `${generateSlug(payload.organizationName)}-${attempt}`;
    }

    // Create the organization
    const organization = await OrganizationRepository.create({
      name: payload.organizationName.trim(),
      slug,
      plan: (payload.plan as any) || "FREE",
      isActive: true,
      settings: {
        timezone: "Asia/Kolkata",
        currency: "INR",
      },
      billing: {
        email: payload.adminEmail,
      },
    });

    // Create the SUPER_ADMIN user for this org
    const hashedPassword = await hashPassword(payload.adminPassword);

    const user = await UserRepository.createUser({
      fullName: payload.adminFullName.trim(),
      username: payload.adminUsername.toLowerCase().trim(),
      password: hashedPassword,
      role: Roles.SUPER_ADMIN,
      isActive: true,
      organizationId: organization._id,
    } as any);

    // Issue tokens
    const tokenPayload = {
      userId: user._id.toString(),
      role: user.role,
      username: user.username,
      fullName: user.fullName,
      organizationId: organization._id.toString(),
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    const refreshTokenHash = await hashPassword(refreshToken);
    await UserRepository.updateRefreshTokenHash(
      user._id.toString(),
      refreshTokenHash
    );

    return {
      organization: {
        id: organization._id.toString(),
        name: organization.name,
        slug: organization.slug,
        plan: organization.plan,
      },
      user: toUserResponse(user),
      accessToken,
      refreshToken,
    };
  }

  static async getById(orgId: string) {
    const org = await OrganizationRepository.findById(orgId);
    if (!org) throw new AppError("Organization not found", 404);
    return org;
  }

  static async getBySlug(slug: string) {
    const org = await OrganizationRepository.findBySlug(slug);
    if (!org) throw new AppError("Organization not found", 404);
    return org;
  }

  static async update(orgId: string, update: Record<string, unknown>) {
    const org = await OrganizationRepository.update(orgId, update as any);
    if (!org) throw new AppError("Organization not found", 404);
    return org;
  }

  static async listAll(page = 1, limit = 50) {
    const [organizations, total] = await Promise.all([
      OrganizationRepository.list(page, limit),
      OrganizationRepository.count(),
    ]);
    return {
      data: organizations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
