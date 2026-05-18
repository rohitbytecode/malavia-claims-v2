import request from "supertest";
import app from "@/app.js";
import { ClaimModel } from "@/modules/claims/schema/claim.schema.js";
import { ClaimStatus } from "@/modules/claims/constant/claim-status.enum.js";
import { ClaimType } from "@/modules/claims/constant/claim-type.enum.js";
import mongoose from "mongoose";

describe("Claim Workflow Transitions", () => {
  let claimId: string;

  beforeAll(async () => {
    const claim = await ClaimModel.create({
      claimNumber: "CLM-TEST-001",
      type: ClaimType.CASHLESS,
      status: ClaimStatus.DRAFT,
      patientId: new mongoose.Types.ObjectId(),
      hospitalId: new mongoose.Types.ObjectId(),
      totalClaimAmount: 50000,
    });
    claimId = claim.id.toString();
  });

  it("should successfully transition DRAFT to PREAUTH_PENDING", async () => {
    const response = await request(app)
      .post(`/api/v1/claims/${claimId}/status-transition`)
      .send({
        toStatus: ClaimStatus.PREAUTH_PENDING,
        remarks: "Submitting for preauth",
      });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe(ClaimStatus.PREAUTH_PENDING);
  });

  it("should fail invalid transition (PREAUTH_PENDING directly to SETTLED)", async () => {
    const response = await request(app)
      .post(`/api/v1/claims/${claimId}/status-transition`)
      .send({
        toStatus: ClaimStatus.SETTLED,
        remarks: "Invalid jump",
      });

    expect(response.status).toBe(400); // Bad Request (AppError from workflow validation)
  });
});
