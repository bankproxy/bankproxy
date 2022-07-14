import {
  AccountDetails,
  SepaCreditTransferPayment,
  Transaction,
  Transactions,
} from "./Types";
import { BadRequestError, NotFoundError, NotImplementedError } from "./Errors";
import TaskBase from "./TaskBase";
import { isDevelopment } from "./Utilities";

export default abstract class extends TaskBase {
  static readonly CONFIGS = [...TaskBase.CONFIGS];
  #auth: string[];
  #storeUserConfig = true;

  get auth() {
    return this.#auth;
  }

  get authFields() {
    return [];
  }

  get log() {
    return isDevelopment ? console.log : () => {};
  }

  async promptAuth() {
    const fields = this.authFields;

    this.#auth = await Promise.all(fields.map((key) => this.userConfig(key)));
    if (!this.#auth.includes(undefined)) return;

    const ret = await this.prompt("Credentials", "Login", ($) => {
      for (const name of fields) {
        const label = this.authFieldLabel(name);
        if (this.authFieldIsPassword(name)) {
          $.password(name, label);
        } else {
          $.input(name, label);
        }
      }
      $.checkbox("_remember", "Remember");
    });

    this.#storeUserConfig = !!ret["_remember"];
    this.#auth = fields.map((n) => ret[n]);

    if (this.#storeUserConfig)
      await Promise.all(fields.map((key) => this.setUserConfig(key, ret[key])));
  }

  authFieldIsPassword(name: string) {
    return ["pass", "password", "pin"].includes(name);
  }

  authFieldLabel(name: string) {
    switch (name) {
      case "disposer":
        return "Disposer";
      case "disposernr":
        return "Disposer-Nr.";
      case "email":
        return "E-Mail";
      case "pass":
      case "password":
        return "Password";
      case "pin":
        return "PIN";
      case "user":
        return "User";
      case "username":
        return "Username";
    }
  }

  async setup() {}
  async login() {}
  async logout() {}
  async cleanup() {}

  async callForEach<T>(cb: (...T) => Promise<T>, ...args: any[][]) {
    const ret: T[] = [];
    for (let i = 0; i < args[0].length; ++i) {
      ret.push(
        await cb.apply(
          this,
          args.map((arr) => arr[i])
        )
      );
    }
    return ret;
  }

  async accountInfos(ibans: string[]) {
    return this.callForEach(this.accountInfo, ibans);
  }

  async accountInfo(iban: string) {
    return iban;
  }

  async balancesForAllAccounts(
    accountDetails: AccountDetails[]
  ): Promise<any[]> {
    return this.callForEach(this.balancesForAccount, accountDetails);
  }

  async balancesForAccount(_accountDetails: AccountDetails) {
    return [];
  }

  async transactionsForAllAccounts(
    accountDetails: AccountDetails[]
  ): Promise<Transactions[]> {
    const balances = await this.balancesForAllAccounts(accountDetails);
    return this.callForEach(
      this.transactionsForAccount,
      accountDetails,
      balances
    );
  }

  async transactionsForAccount(
    accountDetails: AccountDetails,
    balances: any
  ): Promise<Transactions> {
    return {
      account: {
        iban: accountDetails.iban,
      },
      balances,
      transactions: {
        booked: await this.bookedTransactionsForAccount(accountDetails),
      },
    };
  }

  async bookedTransactionsForAccount(
    accountDetails: AccountDetails
  ): Promise<Transaction[]> {
    const ret = [];
    for await (const raw of this.rawTransactionsForAccount(accountDetails)) {
      const mapped = this.mapRawTransaction(raw);
      if (mapped.entryReference === accountDetails.entryReferenceFrom) break;
      ret.push(mapped);
    }
    return ret;
  }

  async *rawTransactionsForAccount(
    _accountDetails: AccountDetails
  ): AsyncGenerator<any> {
    throw new NotImplementedError();
  }

  mapRawTransaction(value: any): Transaction {
    return value;
  }

  async executeSepaCreditTransferPayments(
    _payments: SepaCreditTransferPayment[]
  ): Promise<any> {
    throw new NotImplementedError();
  }

  async execute(): Promise<Transactions[]> {
    const accounts = this.accounts;
    if (!accounts.length) throw new BadRequestError("No valid account");

    this.spinner("Logging in");
    await this.login();
    this.spinner("Logged in");

    const sepaCreditTransferPayments = this.sepaCreditTransferPayments;
    if (sepaCreditTransferPayments.length) {
      await this.executeSepaCreditTransferPayments(sepaCreditTransferPayments);
    }

    const ibans = accounts.map((acc) => acc.iban);
    this.spinner("Getting information about accounts...");
    const accountInfos = await this.accountInfos(ibans);
    const accountDetails = accounts.map((value, index): AccountDetails => {
      const accountInfo = accountInfos[index];
      if (!accountInfo)
        throw new NotFoundError(
          `Could not get information for account ${value.iban}.`
        );
      return {
        info: accountInfo,
        iban: value.iban,
        dateFrom: value.dateFrom,
        dateTo: value.dateTo,
        entryReferenceFrom: value.entryReferenceFrom,
      };
    });

    this.spinner("Getting transactions for all accounts");
    const ret = await this.transactionsForAllAccounts(accountDetails);

    this.spinner("Logging out");
    await this.logout();
    this.spinner("Logged out");

    return ret;
  }

  override async run() {
    await this.loadConfig();
    if (this.reconfigure) await this.storeUserConfig();
    else await this.loadUserConfig();
    await this.promptAuth();

    let result: Transactions[] = null;
    try {
      await this.setup();
      result = await this.execute();
      if (this.#storeUserConfig) await this.storeUserConfig();
    } catch (e) {
      throw e;
    } finally {
      await this.cleanup();
    }

    return { result };
  }
}
