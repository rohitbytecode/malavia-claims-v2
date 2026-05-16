import request from "supertest";
import app from "@/app.js";
import { UserModel } from "@/modules/users/schema/user.schema.js";
import bcrypt from "bcrypt";
import { Roles } from "@/core/enums/roles.enum.js";

describe("Auth Endpoints", () => {
  it("should authenticate a valid user and return tokens", async () => {
    // Setup user
    const password = "Password123!";
    const hashedPassword = await bcrypt.hash(password, 10);
    await UserModel.create({
      fullName: "Test User",
      email: "test@local.com",
      password: hashedPassword,
      role: Roles.CLAIM_MANAGER,
      isActive: true,
    });

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "test@local.com",
        password,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeDefined();
  });

  it("should fail authentication with invalid password", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: "test@local.com",
        password: "WrongPassword",
      });

    expect(response.status).toBe(401);
  });
});
