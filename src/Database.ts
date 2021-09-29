import { CreatedModel, createModel } from "./DatabaseModel";
import Cipher from "./Cipher";
import DatabaseItem from "./DatabaseItem";
import { Includeable } from "sequelize/types";

export default class {
  readonly #model: CreatedModel;
  readonly #salt: string;

  constructor(salt: string, uri: string) {
    this.#model = createModel(uri);
    this.#salt = salt;
  }

  init() {
    return this.#model.init();
  }

  async create(user: string, type: string, name: string) {
    const connector = await this.#model.Connector.create({ type, name });
    await connector.createConnectorUser({ user });
    return new DatabaseItem(
      connector,
      await this.#itemCipher(connector.clientSecret)
    );
  }

  async checkCredentials(clientId: string, clientSecret: string) {
    const connector = await this.#model.Connector.findOne({
      where: { clientId },
    });
    return connector && (await connector.checkClientSecret(clientSecret));
  }

  async list(user: string) {
    const include: Includeable[] = [];
    if (user)
      include.push({ model: this.#model.ConnectorUser, where: { user } });
    return this.#model.Connector.findAll({
      include,
    });
  }

  async find(user: string, clientId: string, clientSecret: string) {
    const include: Includeable[] = [this.#model.ConnectorConfig];
    if (user)
      include.push({ model: this.#model.ConnectorUser, where: { user } });
    const connector = await this.#model.Connector.findOne({
      where: { clientId },
      include,
    });
    if (!connector || !(await connector.checkClientSecret(clientSecret)))
      return null;
    return new DatabaseItem(connector, await this.#itemCipher(clientSecret));
  }

  async destroy(user: string, clientId: string) {
    const include: Includeable[] = [];
    if (user)
      include.push({ model: this.#model.ConnectorUser, where: { user } });
    const connector = await this.#model.Connector.findOne({
      where: { clientId },
      include,
    });
    if (!connector) return false;
    await connector?.destroy();
    return true;
  }

  async #itemCipher(clientSecret: string) {
    return new Cipher(await Cipher.deriveKey(clientSecret, this.#salt));
  }
}
