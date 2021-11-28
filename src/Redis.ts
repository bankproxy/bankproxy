import * as fakeredis from "fakeredis";
import * as redis from "redis";
import Cipher, { CIPHER_KEY_LEN } from "./Cipher";
import { hkdfAsync } from "./Utilities";
import { promisify } from "util";

const EXPIRE_SECONDS = 10 * 60;
const KEY_ENCODING = "hex";

function createFakeRedisClient(): any {
  const client = fakeredis.createClient();
  return {
    connect() {},
    get: promisify(client.get).bind(client),
    del: promisify(client.del).bind(client),
    setEx: promisify(client.setex).bind(client),
  };
}

export default class {
  readonly #redis: ReturnType<typeof redis.createClient>;
  readonly #salt: string;

  constructor(salt: string, url?: string) {
    this.#salt = salt;
    this.#redis = url ? redis.createClient({ url }) : createFakeRedisClient();
  }

  async connect() {
    return await this.#redis.connect();
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
    await this.#redis.setEx(redisKey, EXPIRE_SECONDS, value);
    return key.toString(KEY_ENCODING);
  }

  async getdel(
    prefix: string,
    token: string
  ): Promise<Record<string, unknown>> {
    const key = Buffer.from(token, KEY_ENCODING);
    if (!key.byteLength) return;
    const [cipher, redisKey] = await this.#cipherAndRedisKey(prefix, key);
    const value = await this.#redis.get(redisKey);
    if (!value) return;
    await this.#redis.del(redisKey);
    return JSON.parse(await cipher.decryptBase64(value));
  }
}
