import { createCipheriv, createDecipheriv } from "crypto";
import { randomBytesAsync, scryptAsync } from "./Utilities";

export const BASE64_ENCODNG = "base64";
export const CIPHER_IV_LEN = 16;
export const CIPHER_KEY_LEN = 32;

type CreateFunction = typeof createCipheriv | typeof createDecipheriv;

export default class Cipher {
  readonly #key: Buffer;

  constructor(key: Buffer) {
    this.#key = key;
  }

  cipherValue(fn: CreateFunction, iv: Buffer, value: Buffer) {
    const cipher = fn(`aes-${CIPHER_KEY_LEN * 8}-cbc`, this.#key, iv);

    try {
      const buffer1 = cipher.update(value);
      const buffer2 = cipher.final();
      return Buffer.concat([buffer1, buffer2]);
    } catch (e) {}
  }

  async encrypt(data: string) {
    if (!data) return;

    const buffer = Buffer.from(data);
    const iv = await randomBytesAsync(CIPHER_IV_LEN);
    const cipher = this.cipherValue(createCipheriv, iv, buffer);
    return Buffer.concat([iv, cipher]);
  }

  async encryptBase64(data: string) {
    if (!data) return;

    const ret = await this.encrypt(data);
    return ret.toString(BASE64_ENCODNG);
  }

  async decrypt(buffer: Buffer) {
    if (!buffer) return;

    const iv = buffer.slice(0, CIPHER_IV_LEN);
    const cipher = buffer.slice(CIPHER_IV_LEN);
    return this.cipherValue(createDecipheriv, iv, cipher)?.toString();
  }

  async decryptBase64(data: string) {
    if (!data) return;

    return this.decrypt(Buffer.from(data, BASE64_ENCODNG));
  }

  async deriveCipher(password: string) {
    return new Cipher(await Cipher.deriveKey(password, this.#key));
  }

  static generateRandomKey() {
    return randomBytesAsync(CIPHER_KEY_LEN);
  }

  static deriveKey(password: string | Buffer, salt: string | Buffer) {
    return scryptAsync(password, salt, CIPHER_KEY_LEN) as Promise<Buffer>;
  }
}
