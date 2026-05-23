import { Request, Response, NextFunction } from "express";
import { ClaimService } from "@/modules/claims/service/claim.service.js";

export class ClaimController {
  static async createClaim(req: Request, res: Response, next: NextFunction) {
    try {
      const claim = await ClaimService.createClaim(req.body);

      return res.status(201).json({
        success: true,
        message: "Claim created successfully",
        data: claim,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getClaimById(req: Request, res: Response, next: NextFunction) {
    try {
      const claimId = Array.isArray(req.params.claimId)
        ? req.params.claimId[0]
        : req.params.claimId;

      const claim = await ClaimService.getClaimById(claimId);

      return res.status(200).json({
        success: true,
        message: "Claim fetched successfully",
        data: claim,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listClaims(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, status, page, limit } = req.query as {
        type?: string;
        status?: string;
        page?: string;
        limit?: string;
      };

      const claims = await ClaimService.listClaims(
        type as any,
        status as any,
        Number(page ?? 1),
        Number(limit ?? 20)
      );

      return res.status(200).json({
        success: true,
        message: "Claims listed successfully",
        data: claims,
      });
    } catch (error) {
      next(error);
    }
  }

  static async transitionClaimStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const claimId = Array.isArray(req.params.claimId)
        ? req.params.claimId[0]
        : req.params.claimId;

      if (!claimId || claimId === "undefined") {
        return res.status(400).json({
          success: false,
          message: "Missing or invalid claim ID",
        });
      }

      const { toStatus, remarks, performedBy, claimNumber, totalClaimAmount } = req.body;
      const claim = await ClaimService.transitionClaimStatus(
        claimId,
        toStatus,
        remarks,
        performedBy,
        claimNumber,
        totalClaimAmount
      );

      return res.status(200).json({
        success: true,
        message: "Claim status updated successfully",
        data: claim,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getClaimHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const claimId = Array.isArray(req.params.claimId)
        ? req.params.claimId[0]
        : req.params.claimId;
      const history = await ClaimService.getStatusHistory(claimId);

      return res.status(200).json({
        success: true,
        message: "Claim status history fetched successfully",
        data: history,
      });
    } catch (error) {
      next(error);
    }
  }
}
