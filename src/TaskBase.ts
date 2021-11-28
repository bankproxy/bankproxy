import { Account, Transactions } from "./Types";
import ContentBuilder from "./ContentBuilder";
import TaskParameters from "./TaskParameters";
import { isDevelopment } from "./Utilities";

const CONFIG_KEY_IBAN = "IBAN";
const WAIT_UNTIL_TIME = 3000;

export default abstract class {
  static readonly CONFIGS = [CONFIG_KEY_IBAN];
  readonly #params: TaskParameters;
  #ibans: string[];
  #userConfig = new Map<string, string>();

  constructor(params: TaskParameters) {
    this.#params = params;
  }

  get ID(): string {
    return "";
  }

  get #body() {
    return this.#params.body;
  }

  get #ui() {
    return this.#params.ui;
  }

  get user(): string {
    return this.#body.user || "";
  }

  get reconfigure(): boolean {
    return this.#body.reconfigure;
  }

  get ibans() {
    return this.#ibans;
  }

  get rawAccounts(): Account[] {
    return this.#body.accounts || [];
  }

  get accounts() {
    return this.rawAccounts.filter((acc) => this.ibans.includes(acc.iban));
  }

  get payments() {
    return this.#body.payments;
  }

  get sepaCreditTransferPayments() {
    return this.payments?.sepaCreditTransferPayments || [];
  }

  get clientConnected() {
    return true;
  }

  get ipAddress() {
    return this.#ui.ipAddress;
  }

  get ipPort() {
    return this.#ui.ipPort;
  }

  get userAgent() {
    return this.#ui.userAgent;
  }

  get callbackUri(): string {
    return this.#params.callbackUri;
  }

  protected async setConfig(name: string, value: string, force = false) {
    const oldValue = await this.config(name);
    if (!force && oldValue === value) return;
    await this.#params.db.setConfig(name, value);
  }

  protected async config(name: string) {
    return this.#params.db.config(name);
  }

  protected async setUserConfig(key: string, value: string, force = false) {
    const oldValue = await this.userConfig(key);
    if (!force && oldValue === value) return;
    this.#userConfig.set(key, value);
  }

  protected async userConfig(key: string) {
    return this.#userConfig.get(key);
  }

  protected async loadConfig() {
    const configIban = await this.config(CONFIG_KEY_IBAN);
    this.#ibans = configIban?.split(",") || [];
  }

  protected async loadUserConfig() {
    this.#userConfig.clear();
    try {
      const value = await this.#params.userConfigStore.get();
      this.#userConfig = new Map<string, string>(JSON.parse(value));
    } catch (e) {}
  }

  protected async storeUserConfig() {
    const value = JSON.stringify([...this.#userConfig.entries()]);
    return this.#params.userConfigStore.set(value);
  }

  protected async wait(ms: number) {
    return this.#ui.wait(ms);
  }

  protected async waitUntil<T>(fn: () => Promise<T>) {
    while (this.clientConnected) {
      await this.wait(WAIT_UNTIL_TIME);
      const ret = await fn();
      if (ret) return ret;
    }
  }

  protected async waitToAcceptCode<T>(code: string, fn: () => Promise<T>) {
    this.spinner(`Please accept code ${code}`);
    return this.waitUntil(fn);
  }

  prompt(title: string, submit: string, fn: (builder: ContentBuilder) => void) {
    return this.#ui.prompt(title, submit, fn);
  }

  promptOption(title: string, options: { value: string; text?: string }[]) {
    return this.#ui.promptOption(title, options);
  }

  spinner(text: string) {
    if (isDevelopment) console.log(text);
    return this.#ui.spinner(text);
  }

  callback(url: string, text: string) {
    return this.#ui.callback(url, text);
  }

  abstract run(): Promise<{ result: Transactions[] }>;
}
