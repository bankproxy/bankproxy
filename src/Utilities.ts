import {
  createHash,
  createPublicKey,
  hkdf,
  publicEncrypt,
  randomBytes,
  scrypt,
} from "crypto";
import { promisify } from "util";
import { rsaPublicKey } from "bursar";

export const hkdfAsync = promisify(hkdf);
export const randomBytesAsync = promisify(randomBytes);
export const scryptAsync = promisify(scrypt);

export const isDevelopment = process.env.NODE_ENV === "development";

export async function randomHexBytesAsync(size: number) {
  const ret = await randomBytesAsync(size);
  return ret.toString("hex");
}

export function containsOnlyNumbers(text: string) {
  return text && !!text.match(/^\d+$/);
}

export function dateDMYToYMD(text: string) {
  return text.split(".").reverse().join("-");
}

export function ifDefined(value?: string) {
  if (value) return value;
}

export function addSearchParams(uri: string, data?: any) {
  if (data) {
    uri += uri.indexOf("?") < 0 ? "?" : "&";
    uri += querystringStringify(data);
  }
  return uri;
}

export function querystringStringify(data: Record<string, string>) {
  const ret = new URLSearchParams(data);
  return ret.toString();
}

export function sha256hexdigest(data: string) {
  return createHash("sha256").update(data).digest("hex");
}

export function publicRsaEncryptUpperHex(key: any, buffer: Buffer) {
  const pem = rsaPublicKey.pkcs1(key);
  return publicEncrypt(createPublicKey(pem), buffer)
    .toString("hex")
    .toUpperCase();
}
