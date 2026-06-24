import { Request, Response } from "express";
import { OrganizationService } from "@/modules/organizations/service/organization.service.js";

export class OrganizationController {
  /** POST /api/v1/organizations/register — public endpoint */
  static async register(req: Request, res: Response) {
    const result = await OrganizationService.register(req.body);

    return res.status(201).json({
      success: true,
      message: "Organization registered successfully",
      data: result,
    });
  }

  /** GET /api/v1/organizations/me — get own org details */
  static async getOwn(req: Request, res: Response) {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      return res.status(403).json({ success: false, message: "No organization context" });
    }

    const organization = await OrganizationService.getById(orgId);

    return res.status(200).json({
      success: true,
      data: organization,
    });
  }

  /** PATCH /api/v1/organizations/me — update own org */
  static async updateOwn(req: Request, res: Response) {
    const orgId = req.user?.organizationId;
    if (!orgId) {
      return res.status(403).json({ success: false, message: "No organization context" });
    }

    const organization = await OrganizationService.update(orgId, req.body);

    return res.status(200).json({
      success: true,
      message: "Organization updated",
      data: organization,
    });
  }

  /** GET /api/v1/organizations — platform admin: list all orgs */
  static async listAll(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await OrganizationService.listAll(page, limit);

    return res.status(200).json({
      success: true,
      data: result,
    });
  }
}
