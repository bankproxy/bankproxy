import {
  createHash,
  createPublicKey,
  hkdf,
  publicEncrypt,
  randomBytes,
  scrypt,
} from "crypto";
import { promisify } from "util";

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

export function isSimilarWithoutWhitespace(a: string, b: string) {
  if (!a || !b) return false;
  return a.replace(/\s/g, "") === b.replace(/\s/g, "");
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

export function hexToBase64(data: string) {
  return Buffer.from(data, "hex").toString("base64");
}

export function publicRsaEncryptUpperHex(
  { modulus, publicExponent }: { modulus: string; publicExponent: string },
  buffer: Buffer
) {
  const key = {
    kty: "RSA",
    e: hexToBase64(publicExponent),
    n: hexToBase64(modulus),
  };
  return publicEncrypt(createPublicKey({ format: "jwk", key }), buffer)
    .toString("hex")
    .toUpperCase();
}
