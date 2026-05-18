import { Types } from "mongoose";
import { CommunicationModel } from "@/modules/communications/schema/communication.schema.js";
import { CommunicationDocument } from "@/modules/communications/types/communication.types.js";

interface CommunicationFilters {
  medium?: string;
  followUpBefore?: Date;
  followUpAfter?: Date;
}

export class CommunicationRepository {
  static async createCommunication(payload: Partial<CommunicationDocument>) {
    return CommunicationModel.create(payload);
  }

  static async listCommunicationsByClaim(
    claimId: string,
    filters: CommunicationFilters,
    page: number,
    limit: number
  ) {
    if (!claimId || !Types.ObjectId.isValid(claimId)) {
      return [];
    }
    const query: Record<string, unknown> = {
      claimId: new Types.ObjectId(claimId),
    };

    if (filters.medium) {
      query.medium = filters.medium;
    }

    if (filters.followUpBefore) {
      query.followUpDate = {
        ...(query.followUpDate as object),
        $lte: filters.followUpBefore,
      };
    }

    if (filters.followUpAfter) {
      query.followUpDate = {
        ...(query.followUpDate as object),
        $gte: filters.followUpAfter,
      };
    }

    return CommunicationModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
}
