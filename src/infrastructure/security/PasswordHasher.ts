/**
 * PasswordHasher — bcrypt wrapper для хэширования паролей.
 * Clean Architecture: infrastructure adapter.
 */
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const SALT_ROUNDS = 12;

export class PasswordHasher {
  static async hash(plain: string): Promise<string> {
    if (!plain || plain.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }
    return bcrypt.hash(plain, SALT_ROUNDS);
  }

  static async verify(plain: string, hash: string): Promise<boolean> {
    if (!plain || !hash) return false;
    try {
      return await bcrypt.compare(plain, hash);
    } catch {
      return false;
    }
  }

  static generateToken(bytes = 32): string {
    return randomBytes(bytes).toString("hex");
  }
}
