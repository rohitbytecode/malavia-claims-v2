import { Request, Response, NextFunction } from "express";
import { PayerContractService } from "../service/payer-contract.service.js";

export class PayerContractController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const contract = await PayerContractService.create(req.body);
      return res.status(201).json({
        success: true,
        message: "Payer contract created successfully",
        data: contract,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const contract = await PayerContractService.getById(req.params.id as string);
      return res.status(200).json({
        success: true,
        message: "Payer contract fetched",
        data: contract,
      });
    } catch (error) {
      next(error);
    }
  }

  static async listByCompany(req: Request, res: Response, next: NextFunction) {
    try {
      const contracts = await PayerContractService.listByCompany(
        req.params.insuranceCompanyId as string
      );
      return res.status(200).json({
        success: true,
        message: "Payer contracts listed",
        data: contracts,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getActiveByCompany(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const contract = await PayerContractService.getActiveByCompany(
        req.params.insuranceCompanyId as string
      );
      return res.status(200).json({
        success: true,
        message: contract
          ? "Active payer contract fetched"
          : "No active contract found",
        data: contract,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const contract = await PayerContractService.update(
        req.params.id as string,
        req.body
      );
      return res.status(200).json({
        success: true,
        message: "Payer contract updated",
        data: contract,
      });
    } catch (error) {
      next(error);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await PayerContractService.remove(req.params.id as string);
      return res.status(200).json({
        success: true,
        message: "Payer contract removed",
      });
    } catch (error) {
      next(error);
    }
  }
}
