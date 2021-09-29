import DatabaseItem from "./DatabaseItem";
import UserConfigStore from "./UserConfigStore";

const CONFIG_KEY_USER_CONFIG = "UserConfig";

export default class implements UserConfigStore {
  readonly #db: DatabaseItem;

  constructor(db: DatabaseItem) {
    this.#db = db;
  }

  async get() {
    return this.#db.config(CONFIG_KEY_USER_CONFIG);
  }

  async set(value: string) {
    return this.#db.setConfig(CONFIG_KEY_USER_CONFIG, value);
  }
}
