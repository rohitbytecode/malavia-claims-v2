import { UserRepository } from "@/modules/users/repository/user.repository.js";
import { UserDocument } from "@/modules/users/types/user.types.js";

export class AuthRepository {
  static async findUserByUsername(username: string) {
    return UserRepository.findByUsername(username);
  }

  static async findUserById(userId: string) {
    return UserRepository.findByIdWithAuthSecrets(userId);
  }

  static async saveRefreshTokenHash(userId: string, refreshTokenHash: string) {
    return UserRepository.updateRefreshTokenHash(userId, refreshTokenHash);
  }

  static async clearRefreshTokenHash(userId: string) {
    return UserRepository.updateRefreshTokenHash(userId, undefined);
  }
}
