import crypto from "crypto";
import { env } from "@/config/env.js";

const ALGORITHM = "aes-256-cbc";
const KEY = crypto
  .createHash("sha256")
  .update(env.PORTAL_PASSWORD_SECRET)
  .digest();
const IV_LENGTH = 16;

export const encryptPortalPassword = (password: string) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(password, "utf8"),
    cipher.final(),
  ]);

  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
};

export const decryptPortalPassword = (encrypted: string) => {
  try {
    if (!encrypted) return "";

    const parts = encrypted.split(":");
    if (parts.length !== 2) return "";

    const [ivHex, encryptedHex] = parts;
    if (!ivHex || !encryptedHex) return "";

    // Basic hex validation (avoid Buffer.from accepting partial/invalid hex)
    if (!/^[0-9a-fA-F]+$/.test(ivHex) || !/^[0-9a-fA-F]+$/.test(encryptedHex)) {
      return "";
    }

    const iv = Buffer.from(ivHex, "hex");
    if (iv.length !== IV_LENGTH) return "";

    const encryptedBuffer = Buffer.from(encryptedHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);

    return Buffer.concat([
      decipher.update(encryptedBuffer),
      decipher.final(),
    ]).toString("utf8");
  } catch (e) {
    // Most common cause: PORTAL_PASSWORD_SECRET changed (ERR_OSSL_BAD_DECRYPT)
    return "";
  }
};
