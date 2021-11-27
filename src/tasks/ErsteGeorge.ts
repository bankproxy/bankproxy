import { AccountDetails, Transaction } from "../Types";
import TaskBaseCheerio from "../TaskBaseCheerio";
import { publicRsaEncryptUpperHex } from "../Utilities";

const PAGE_SIZE = 25;

function toAccount(name: string, account: any) {
  return {
    name: name,
    account: {
      iban: account.iban,
    },
  };
}

function toAmount({ value, precision, currency }) {
  return {
    amount: String(value / 10 ** precision),
    currency,
  };
}

function toDate(timestamp: number) {
  const dt = new Date(timestamp);
  const year = String(dt.getFullYear()).padStart(4, "0");
  const month = String(dt.getMonth() + 1).padStart(2, "0");
  const date = String(dt.getDate()).padStart(2, "0");
  return `${year}-${month}-${date}`;
}

export default class extends TaskBaseCheerio {
  static readonly CONFIGS = [...TaskBaseCheerio.CONFIGS];
  static readonly ID = "at.sparkasse.george";

  override get authFields() {
    return ["username"];
  }

  override async login() {
    const [username] = this.auth;

    await this.get(this.loginOAuthUrl);
    await this.postForm(this.loginOAuthUrl, {
      j_username: username,
      javaScript: "jsOK",
    });

    const page = this.page;
    const commontext = page.text(".commontext > b:last-of-type");
    const map = page.formElements("#credentials");
    if (map) {
      let password = await this.config("password");
      if (!password) {
        const res = await this.prompt("Login:", "Login", (_) => {
          _.input("password", "Password:");
        });
        password = res.password;
      }

      const publicExponent = map.exponent;
      const modulus = map.modulus;
      const saltCode = map.saltCode;

      const rsaEncrypted = publicRsaEncryptUpperHex(
        { modulus, publicExponent },
        Buffer.from(saltCode + "\t" + password)
      );

      await this.finishLogin({ rsaEncrypted, saltCode });
    } else if (commontext) {
      await this.waitToAcceptCode(commontext, async () => {
        await this.postForm(this.loginSecappUrl);
        return this.json.secondFactorStatus === "DONE";
      });
      await this.finishLogin();
    }
  }

  override async logout() {
    await this.delete(this.logoutUrl);
  }

  override async accountInfos(ibans: string[]) {
    await this.get("/accounts");
    const accounts = this.json.collection;
    return ibans.map((iban) =>
      accounts.find((item) => item?.accountno?.iban === iban)
    );
  }

  override get baseUrl() {
    return "https://api.sparkasse.at/proxy/g/api/my";
  }

  get logoutUrl() {
    return "https://api.sparkasse.at/rest/netbanking/auth/token/invalidate";
  }

  get loginBaseUrl() {
    return "https://login.sparkasse.at/sts";
  }
  get loginOAuthUrl() {
    return (
      this.loginBaseUrl +
      "/oauth/authorize?client_id=georgeclient&response_type=token"
    );
  }
  get loginSecappUrl() {
    return this.loginBaseUrl + "/secapp/secondfactor?client_id=georgeclient";
  }

  override async balancesForAccount(accountDetails: AccountDetails) {
    const account = accountDetails.info;

    return [
      {
        balanceAmount: toAmount(account.balance),
        balanceType: "expected",
      },
      {
        balanceAmount: toAmount(account.disposable),
        balanceType: "authorised",
      },
    ];
  }

  override async *rawTransactionsForAccount(accountDetails: AccountDetails) {
    for (let i = 0; ; ++i) {
      this.spinner(`Getting page ${i + 1} of transactions`);

      await this.get("/transactions", {
        pageSize: PAGE_SIZE,
        suggest: true,
        page: i,
        id: accountDetails.info.id,
      });
      const collection = this.json.collection;
      if (!collection.length) return;
      for (const item of collection) yield item;
    }
  }

  override mapRawTransaction(item: any): Transaction {
    const sender = toAccount(item.senderName, item.sender);
    const receiver = toAccount(item.receiverName, item.receiver);

    const [creditor, debtor] = item.creditorId
      ? [sender, receiver]
      : [receiver, sender];

    const references = [
      item.paymentReference,
      item.senderReference,
      item.subtitle,
    ].filter((t) => t && t !== "");

    return {
      transactionId: item.id,
      entryReference: item.id,
      valueDate: toDate(item.valuationDate),
      bookingDate: toDate(item.bookingDate),
      transactionAmount: toAmount(item.amount),
      debtorName: debtor.name,
      debtorAccount: debtor.account,
      creditorName: creditor.name,
      creditorAccount: debtor.account,
      creditorId: item.creditorId,
      mandateId: item.mandateId,
      remittanceInformationUnstructured: references[0],
      _: item,
    };
  }

  async finishLogin(data?: any) {
    await this.postForm(this.loginOAuthUrl, data);
    this.setAccessTokenFromLocationHeader();
  }
}
