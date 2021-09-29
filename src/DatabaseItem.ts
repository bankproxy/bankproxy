import { Connector, ConnectorConfig } from "./DatabaseModel";
import Cipher from "./Cipher";
import { NotImplementedError } from "./Errors";

export default class DatabaseItem {
  readonly #connector: Connector;
  readonly #cipher: Cipher;
  #configs = new Map<string, ConnectorConfig>();

  constructor(connector: Connector, cipher: Cipher) {
    this.#connector = connector;
    this.#cipher = cipher;

    if (connector.ConnectorConfigs)
      this.#loadConfigs(connector.ConnectorConfigs);
  }

  async updateLastUsedAt() {
    await this.#connector.update({ lastUsedAt: new Date() }, { silent: true });
  }

  async updateLastSuccededAt() {
    await this.#connector.update(
      { lastSuccededAt: new Date() },
      { silent: true }
    );
  }

  #loadConfigs(configs: ConnectorConfig[]) {
    this.#configs.clear();
    configs.forEach((config) => {
      this.#configs.set(config.name, config);
    });
  }

  async cipherForUser(user: string) {
    return this.#cipher.deriveCipher(user);
  }

  async config(name: string) {
    name = name.toLowerCase();
    const config = this.#configs.get(name);
    if (!config) return;
    return this.#cipher.decrypt(config.cipher);
  }

  async setConfigs(data?: any) {
    if (!data) return;
    await Promise.all(
      Object.entries(data).map(([key, value]) => {
        return this.setConfig(key, String(value));
      })
    );
  }

  async setConfig(name: string, value: string) {
    name = name.toLowerCase();
    const cipher = await this.#cipher.encrypt(value);
    const config = this.#configs.get(name);

    if (config) {
      await config.update({ cipher });
      return;
    }

    this.#configs.set(
      name,
      await this.#connector.createConnectorConfig({
        name,
        cipher,
      })
    );
  }

  get type() {
    return this.#connector.getDataValue("type");
  }

  get name() {
    return this.#connector.getDataValue("name");
  }

  set name(value: string) {
    this.#connector.setDataValue("name", value);
  }

  get clientId() {
    return this.#connector.clientId;
  }

  get clientSecret() {
    return this.#connector.clientSecret;
  }

  get lastUsedAt() {
    return this.#connector.lastUsedAt;
  }

  get lastSuccededAt() {
    return this.#connector.lastSuccededAt;
  }

  get createdAt() {
    return this.#connector.createdAt;
  }

  get updatedAt() {
    return this.#connector.updatedAt;
  }

  regenerateClientSecret() {
    throw new NotImplementedError();
  }

  destroy() {
    return this.#connector.destroy();
  }
}
