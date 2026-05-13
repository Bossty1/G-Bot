import CryptoJS from "crypto-js";

const SECRET = process.env["SESSION_SECRET"] ?? "default-secret-change-in-production";

export function encrypt(plaintext: string): string {
  return CryptoJS.AES.encrypt(plaintext, SECRET).toString();
}

export function decrypt(ciphertext: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET);
  return bytes.toString(CryptoJS.enc.Utf8);
}
