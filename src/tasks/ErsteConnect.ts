import {
  AccountDetails,
  SepaCreditTransferPayment,
  Transactions,
} from "../Types";
import { BadRequestError, InvalidStateError } from "../Errors";
import TaskBaseBerlin from "../TaskBaseBerlin";

const CONFIG_KEY_WALLET_ID = "WalletId";
const CONFIG_KEY_WALLET_SECRET = "WalletSecret";
const CONFIG_KEY_WEB_API_KEY = "WebApiKey";

interface AccountDetailsErsteConnect extends AccountDetails {
  info: {
    _ext: {
      tokenValid: boolean;
    };
  };
}

export default class extends TaskBaseBerlin {
  static readonly CONFIGS = [...TaskBaseBerlin.CONFIGS, CONFIG_KEY_WEB_API_KEY];
  static readonly ID = "com.erstegroup.ersteconnect";

  #configWebApiKey: string;

  protected override addRequestHeaders(headers: any, method: string) {
    super.addRequestHeaders(headers, method);
    if (this.#configWebApiKey) headers["web-api-key"] = this.#configWebApiKey;
  }

  async wallet() {
    const wallet = {
      id: await this.userConfig(CONFIG_KEY_WALLET_ID),
      secret: await this.userConfig(CONFIG_KEY_WALLET_SECRET),
    };

    if (!wallet.id || !wallet.secret) {
      await this.walletPOST("/wallets", {
        clientId: this.oauthClientId,
        clientSecret: this.oauthClientSecret,
      });
      wallet.id = this.json.walletId;
      wallet.secret = this.json.walletSecret;
      await this.setUserConfig(CONFIG_KEY_WALLET_ID, wallet.id);
      await this.setUserConfig(CONFIG_KEY_WALLET_SECRET, wallet.secret);
    }

    return wallet;
  }

  override async accountInfos(ibans: string[]) {
    const ret = await super.accountInfos(ibans);

    const emptyInfos = ret.filter((item) => !item);
    if (!emptyInfos.length) return ret;

    const list = await Promise.all(
      [
        ["EBOE", "Erste Bank and Sparkassen"],
        ["BCR", "Banca Comerciala Romana"],
        ["EBC", "Erste&Steiermärkische Bank d.d."],
        ["EBH", "Erste Bank Hungary Zrt."],
        ["CSAS", "Česká spořitelna a.s."],
        ["SLSP", "Slovenská sporiteľňa, a. s."],
      ].map(async ([idpCode, name]) => {
        await this.postJSON("/wallet/v1/banks", { idpCode });
        return [this.json.loginUrl, name];
      })
    );

    await this.prompt("Add bank accounts", "Done", (_) => {
      list.forEach(([url, name]) => {
        _.link(url, name);
      });
    });

    return await super.accountInfos(ibans);
  }

  override async transactionsForAccount(
    accountDetails: AccountDetailsErsteConnect,
    _balances: any
  ): Promise<Transactions> {
    if (!accountDetails.info?._ext?.tokenValid) {
      throw new BadRequestError(
        `Token invalid for account ${accountDetails.iban}`
      );
    }
    return super.transactionsForAccount(accountDetails, _balances);
  }

  override async login() {
    this.enableClientCertificate();

    const wallet = await this.wallet();

    await this.walletPOST(`/wallets/${wallet.id}/tokens`, {
      clientId: this.oauthClientId,
      clientSecret: this.oauthClientSecret,
      walletSecret: wallet.secret,
    });

    this.setBearerAuthorization(this.json.accessToken);
    this.#configWebApiKey = await this.config(CONFIG_KEY_WEB_API_KEY);
  }

  override async executeSepaCreditTransferPayments(
    payments: SepaCreditTransferPayment[]
  ) {
    this.spinner("Checking account information...");
    await this.accountInfos(
      payments.map((payment) => payment.debtorAccount.iban)
    );

    const paymentIds = [];
    for (const payment of payments) {
      this.spinner(
        `Create payment for ${payment.creditorName} (${payment.instructedAmount.amount})`
      );
      await this.pisPOST("/v1/payments/sepa-credit-transfers", payment);
      paymentIds.push(this.json.paymentId);
    }

    this.spinner("Creating signing basket...");
    const headers = {
      "TPP-Redirect-URI": this.callbackUri,
      "TPP-Nok-Redirect-URI": this.callbackUri,
    };
    await this.withRequestHeaders(headers, () =>
      this.pisPOST("/v1/signing-baskets", { paymentIds })
    );
    const statusHref = this.json._links.status.href;

    await this.callback(this.json._links.scaRedirect.href, "Sign Payments");

    this.spinner("Checking status of signing basket...");
    await this.pisGET(statusHref);
    const transactionStatus = this.json.transactionStatus;
    if (!["ACSP", "ACTC", "ACWC"].includes(transactionStatus))
      throw new InvalidStateError(
        "signing basket transactionStatus",
        transactionStatus
      );
  }

  override get baseUrl() {
    return "https://webapi.developers.erstegroup.com/api/egb/production/v1";
  }
  override get aisBaseUrl() {
    return "/aisp";
  }
  override get pisBaseUrl() {
    return "/pisp";
  }
  get walletBaseUrl() {
    return "https://idp.developers.erstegroup.com/developeridp/api";
  }
  override get piisBaseUrl() {
    return "/psd2-funds-confirmation-api";
  }

  override get oauthScope() {
    return "AISP";
  }

  protected async walletPOST(path: string, body?: any) {
    return this.postJSON(this.walletBaseUrl + path, body);
  }
}
