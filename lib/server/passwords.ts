import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const keyLength = 64;

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = (await scryptAsync(password, salt, keyLength)) as Buffer;

  return `scrypt$${salt.toString("base64")}$${derivedKey.toString("base64")}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, encodedSalt, encodedKey] = passwordHash.split("$");
  if (algorithm !== "scrypt" || !encodedSalt || !encodedKey) return false;

  const salt = Buffer.from(encodedSalt, "base64");
  const expectedKey = Buffer.from(encodedKey, "base64");
  if (expectedKey.length !== keyLength) return false;

  const actualKey = (await scryptAsync(password, salt, keyLength)) as Buffer;
  return timingSafeEqual(actualKey, expectedKey);
}