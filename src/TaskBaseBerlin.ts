import { AccountDetails, Transactions } from "./Types";
import {
  BerlinTppMessagesError,
  InvalidStateError,
  MissingConfigurationError,
  UnsupportedTypeError,
} from "./Errors";
import TaskBaseOAuth from "./TaskBaseOAuth";

const CONFIG_KEY_CONSENT_ID = "ConsentId";
const CONFIG_KEY_CLIENT_CERTIFICATE = "ClientCertificate";
const CONFIG_KEY_CLIENT_CERTIFICATE_KEY = "ClientCertificateKey";

export default abstract class extends TaskBaseOAuth {
  static readonly CONFIGS = [
    ...TaskBaseOAuth.CONFIGS,
    CONFIG_KEY_CLIENT_CERTIFICATE,
    CONFIG_KEY_CLIENT_CERTIFICATE_KEY,
  ];

  protected consentId: string;

  get apiBaseUrl(): string {
    throw new MissingConfigurationError("API Base URL");
  }
  get aisBaseUrl(): string {
    return this.apiBaseUrl;
  }
  get consentsBaseUrl(): string {
    return this.apiBaseUrl;
  }
  get pisBaseUrl(): string {
    return this.apiBaseUrl;
  }
  get piisBaseUrl(): string {
    return this.apiBaseUrl;
  }
  protected override async loadConfig() {
    await super.loadConfig();
    this.setClientCertificate(
      Buffer.from(await this.config(CONFIG_KEY_CLIENT_CERTIFICATE)),
      Buffer.from(await this.config(CONFIG_KEY_CLIENT_CERTIFICATE_KEY))
    );
  }

  async oauthLogin() {
    this.enableClientCertificate(false);
    await super.login();
    this.enableClientCertificate();
  }

  override async login() {
    await this.oauthLogin();
    await this.constentStep();
    await this.setUserConfig(CONFIG_KEY_CONSENT_ID, this.consentId);
  }

  override async transactionsForAccount(
    accountDetails: AccountDetails,
    _balances: any
  ): Promise<Transactions> {
    const accountId = accountDetails.info.resourceId;

    const parameters = {
      bookingStatus: "booked",
      withBalance: true,
    } as any;
    if (accountDetails.entryReferenceFrom)
      parameters.entryReferenceFrom = accountDetails.entryReferenceFrom;
    if (accountDetails.dateFrom) parameters.dateFrom = accountDetails.dateFrom;
    if (accountDetails.dateTo) parameters.dateTo = accountDetails.dateTo;

    let pageNumber = 1;
    this.spinner(`Getting transactions page ${pageNumber}...`);
    await this.aisGET(`/v1/accounts/${accountId}/transactions`, parameters);
    let { account, balances, transactions } = this.json;

    let links = transactions?._links;
    while (links?.next) {
      ++pageNumber;
      this.spinner(`Getting transactions page ${pageNumber}...`);
      await this.aisGET(links.next.href);

      const nextTransactions = this.json.transactions;
      for (const key of Object.getOwnPropertyNames(nextTransactions)) {
        if (key[0] === "_") continue;
        const value = transactions[key] || [];
        transactions[key] = [...value, ...nextTransactions[key]];
      }

      links = nextTransactions?._links;
    }

    if (!balances) {
      this.spinner("Getting balances...");
      await this.aisGET(`/v1/accounts/${accountId}/balances`);
      balances = this.json.balances;
    }

    return {
      account,
      balances,
      transactions,
    };
  }

  async #checkConsent(constentId: string): Promise<any> {
    await this.consentsGET(`/consents/${constentId}`);
    const ret = this.json;
    if (ret.consentStatus !== "valid") return;
    if (!ret.access) return;

    for (const type of ["accounts", "balances", "transactions"]) {
      const list = ret.access[type];
      if (!Array.isArray(list)) return;
      if (!list.find((item) => item.iban == this.ibans[0])) return;
    }

    return ret;
  }

  async constentStep() {
    this.consentId = await this.userConfig(CONFIG_KEY_CONSENT_ID);

    if (this.consentId) {
      this.spinner("Checking existing consent...");
      const ret = await this.#checkConsent(this.consentId);
      if (ret) {
        this.log("Current constent is valid until: " + ret.validUntil);
        return;
      }
    }

    this.spinner("Creating conset...");
    await this.consentsPOST("/consents", {
      access: {
        accounts: [{ iban: this.ibans[0] }],
      },
      recurringIndicator: true,
      validUntil: "9999-12-31",
      frequencyPerDay: 4,
      combinedServiceIndicator: false,
    });
    const { consentId, consentStatus } = this.json;

    this.consentId = consentId;
    if (consentStatus === "valid") return;

    if (consentStatus !== "received")
      throw new InvalidStateError("consentStatus", consentStatus);

    this.spinner("Creating authorisation...");
    await this.consentsPOST(`/consents/${this.consentId}/authorisations`);
    const res = this.json;

    const authorisationId = res.authorisationId;
    let scaStatus = res.scaStatus;
    const authenticationType = res.chosenScaMethod?.authenticationType;
    const challengeData = res.challengeData;
    const path = `/consents/${this.consentId}/authorisations/${authorisationId}`;

    while (this.clientConnected) {
      if (["exempted", "finalised"].includes(scaStatus)) return;
      if (scaStatus === "failed") {
        throw new InvalidStateError(
          "consents authorisations scaStatus",
          "failed"
        );
      }

      let scaAuthenticationData = null;

      if (authenticationType === "SMS_OTP") {
        const data = await this.prompt("Authorize SMS:", "Auth", (_) => {
          _.input("data", "Challenge");
        });
        scaAuthenticationData = data.data;
      } else if (authenticationType === "CHIP_OTP") {
        const data = await this.prompt("Authorize CHIP:", "Auth", (_) => {
          _.text(`ChallengeData: ${JSON.stringify(challengeData)}`);
          _.input("data", "Challenge");
        });
        scaAuthenticationData = data.data;
      } else if (authenticationType === "PHOTO_OTP") {
        const data = await this.prompt("Authorize PHOTO:", "Auth", (_) => {
          _.text(`ChallengeData: ${JSON.stringify(challengeData)}`);
          _.input("data", "Challenge");
        });
        scaAuthenticationData = data.data;
      } else if (authenticationType === "PUSH_OTP") {
        this.spinner("Please accept on your app");
        await this.wait(3000);
      } else {
        throw new UnsupportedTypeError(
          "authenticationType",
          authenticationType
        );
      }

      if (scaAuthenticationData) {
        await this.consentsPUT(path, {
          scaAuthenticationData,
        });
      } else {
        await this.consentsGET(path);
      }
      scaStatus = this.json.scaStatus;
    }
  }

  override async accountInfos(ibans: string[]) {
    await this.aisGET("/v1/accounts");
    const accounts = this.json.accounts;
    return ibans.map((iban) => accounts.find((item) => item.iban === iban));
  }

  async aisGET(path: string, query?: any) {
    return this.#checkResponeStatus(this.get(this.aisBaseUrl + path, query));
  }

  async pisGET(path: string, query?: any) {
    return this.#checkResponeStatus(this.get(this.pisBaseUrl + path, query));
  }

  async pisPOST(path: string, body?: any) {
    return this.#checkResponeStatus(
      this.postJSON(this.pisBaseUrl + path, body)
    );
  }

  async consentsGET(path: string, query?: any) {
    return this.#checkResponeStatus(
      this.get(this.consentsBaseUrl + path, query)
    );
  }

  async consentsPOST(path: string, body?: any) {
    return this.#checkResponeStatus(
      this.postJSON(this.consentsBaseUrl + path, body)
    );
  }

  async consentsPUT(path: string, body?: any) {
    return this.#checkResponeStatus(
      this.putJSON(this.consentsBaseUrl + path, body)
    );
  }

  protected override addRequestHeaders(headers: any, method: string) {
    super.addRequestHeaders(headers, method);
    if (this.consentId) headers["Consent-ID"] = this.consentId;
    if (this.ipAddress) headers["PSU-IP-Address"] = this.ipAddress;
    if (this.ipPort) headers["PSU-IP-Port"] = this.ipPort;
    if (this.userAgent) headers["PSU-User-Agent"] = this.userAgent;
  }

  async #checkResponeStatus(fn: Promise<any>) {
    const ret = await fn;
    const statusCode = this.responseStatusCode;
    if (400 <= statusCode && statusCode < 500)
      throw new BerlinTppMessagesError(this.json.tppMessages);
    return ret;
  }
}
