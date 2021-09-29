import Cipher from "./Cipher";
import TaskUIWebsocket from "./TaskUIWebsocket";
import UserConfigStore from "./UserConfigStore";

export default class implements UserConfigStore {
  readonly #ui: TaskUIWebsocket;
  readonly #name: string;
  readonly #cipher: Cipher;

  constructor(ui: TaskUIWebsocket, name: string, cipher: Cipher) {
    this.#ui = ui;
    this.#name = name;
    this.#cipher = cipher;
  }

  async get() {
    return this.#cipher.decryptBase64(await this.#ui.get(this.#name));
  }

  async set(value: string) {
    return this.#ui.set(this.#name, await this.#cipher.encryptBase64(value));
  }
}
