import * as fakeredis from "fakeredis";
import * as redis from "redis";
import Cipher, { CIPHER_KEY_LEN } from "./Cipher";
import { hkdfAsync } from "./Utilities";
import { promisify } from "util";

const EXPIRE_SECONDS = 10 * 60;
const KEY_ENCODING = "hex";

export default class {
  readonly #redis: redis.RedisClient;
  readonly #salt: string;

  constructor(salt: string, uri?: string) {
    this.#salt = salt;
    this.#redis = uri ? redis.createClient(uri) : fakeredis.createClient();
  }

  async #cipherAndRedisKey(
    prefix: string,
    key: Buffer
  ): Promise<[Cipher, string]> {
    const hash = await hkdfAsync("sha512", key, this.#salt, "", CIPHER_KEY_LEN);
    return [new Cipher(key), prefix + Buffer.from(hash).toString("hex")];
  }

  async add(prefix: string, data: Record<string, unknown>): Promise<string> {
    const key = await Cipher.generateRandomKey();
    const [cipher, redisKey] = await this.#cipherAndRedisKey(prefix, key);
    const value = await cipher.encryptBase64(JSON.stringify(data));
    await promisify(this.#redis.setex).bind(this.#redis)(
      redisKey,
      EXPIRE_SECONDS,
      value
    );
    return key.toString(KEY_ENCODING);
  }

  async getdel(
    prefix: string,
    token: string
  ): Promise<Record<string, unknown>> {
    const key = Buffer.from(token, KEY_ENCODING);
    if (!key.byteLength) return;
    const [cipher, redisKey] = await this.#cipherAndRedisKey(prefix, key);
    const value = await promisify(this.#redis.get).bind(this.#redis)(redisKey);
    if (!value) return;
    await promisify(this.#redis.del).bind(this.#redis)(redisKey);
    return JSON.parse(await cipher.decryptBase64(value));
  }
}
