import {
  AccountDetails,
  SepaCreditTransferPayment,
  Transaction,
} from "../Types";
import { LoginError } from "../Errors";
import TaskBaseHttp from "../TaskBaseHttp";

const PAGE_SIZE = 25;

function toAccount(obj: any) {
  return {
    name: obj.name,
    account: {
      iban: obj.iban,
    },
  };
}

export default class extends TaskBaseHttp {
  static readonly CONFIGS = [...TaskBaseHttp.CONFIGS];
  static readonly ID = "com.holvi.app";

  override get authFields() {
    return ["email", "password"];
  }

  override get baseUrl() {
    return "https://holvi.com/api";
  }

  get logoutUrl() {
    return "https://account.app.holvi.com/logout/";
  }

  override async login() {
    const [email, password] = this.auth;

    const { error, idToken, path } = await this.#authPost(
      "/auth-proxy/login/usernamepassword/",
      {
        client_id: "yIO3banxfsiuQSMrVg7x2LoKAqYKazRV",
        connection: "Username-Password-Authentication",
        grant_type: "password",
        email,
        password,
      }
    );
    if (error) throw new LoginError(error);
    this.setBearerAuthorization(idToken);

    if (!path) return;

    await this.postJSON(path + "session/");
    this.setBearerAuthorization(this.json.id_token);
  }

  override async logout() {
    await this.get(this.logoutUrl);
  }

  override async accountInfos(ibans: string[]) {
    await this.get("/pool/summarylist/");
    const summarylist = this.json;
    return ibans.map((iban) => summarylist.find((item) => item.iban === iban));
  }

  override async executeSepaCreditTransferPayments(
    payments: SepaCreditTransferPayment[]
  ) {
    const handles = await this.accountInfos(
      payments.map((p) => p.debtorAccount.iban)
    );
    return this.callForEach(
      this.#executeSepaCreditTransferPayment,
      handles.map((h) => h.handle),
      payments
    );
  }

  async #executeSepaCreditTransferPayment(
    handle: string,
    data: SepaCreditTransferPayment
  ) {
    this.spinner("Creating transaction...");
    await this.postJSON(`/pool/${handle}/debt/`, {
      receiver: {
        name: data.creditorName,
      },
      type: "outboundpayment",
      subtype: "outbound",
      currency: data.instructedAmount.currency,
      advanced_breakdown: false,
      items: [
        {
          vat_calculation_rule: "unit_gross",
          detailed_price: {
            currency: data.instructedAmount.currency,
            net: data.instructedAmount.amount,
            gross: data.instructedAmount.amount,
          },
        },
      ],
      iban: data.creditorAccount.iban,
      bic: await this.#ibanBic(data.creditorAccount.iban),
      unstructured_reference: data.remittanceInformationUnstructured,
    });

    const debt_uuid = this.json.uuid;

    this.spinner("Initiate auth...");
    await this.#authPost("/auth-proxy/2fa/v1/token/initiate/", {
      action_name: "payment_confirm",
      action_data: { debt_uuid },
    });
  }

  override async balancesForAccount(accountDetails: AccountDetails) {
    const summary = accountDetails.info;
    return [
      {
        balanceAmount: {
          currency: summary.currency,
          amount: summary.account_balance,
        },
        balanceType: "interimAvailable",
      },
      {
        balanceAmount: {
          currency: summary.currency,
          amount: summary.account_available_balance,
        },
        balanceType: "authorised",
      },
    ];
  }

  override async *rawTransactionsForAccount(accountDetails: AccountDetails) {
    this.spinner("Getting first page of transactions");
    await this.get(`/pool/${accountDetails.info.handle}/debt/`, {
      o: "-last_payment_timestamp",
      page_size: PAGE_SIZE,
      transactions: "past",
    });
    let res = this.json;

    for (let i = 2; ; ++i) {
      if (!res) return;

      for (const item of res.results) yield item;

      if (!res.next) return;

      this.spinner(`Getting page ${i} of transactions`);
      await this.get(res.next);
      res = this.json;
    }
  }

  override mapRawTransaction(item: any): Transaction {
    const sender = toAccount(item.sender);
    const receiver = toAccount(item.receiver);

    const [creditor, debtor] =
      item.type === "invoice" ? [sender, receiver] : [receiver, sender];

    let amount = item.value;
    if (item.type === "outboundpayment") {
      amount = "-" + amount;
      if (creditor.account.iban === "") creditor.account.iban = item.iban;
    }

    const date = [
      ...item.items
        .filter((item) => item.type === "settlement")
        .map((item) => item.timestamp),
      item.timestamp,
    ][0].substr(0, 10);

    const references = [
      ...new Set([
        item.structured_reference,
        item.unstructured_reference,
        ...item.payments.map((p) => p.structured_reference),
        ...item.payments.map((p) => p.unstructured_reference),
        ...item.items.map(
          (i) => i.description?.match(/^Payment with message (.*)$/)?.[1]
        ),
      ]),
    ].filter((p) => p && p !== "" && p !== "Payment for debt");

    return {
      transactionId: item.uuid,
      entryReference: item.uuid,
      valueDate: date,
      bookingDate: date,
      transactionAmount: {
        currency: item.currency,
        amount,
      },
      debtorName: debtor?.name,
      debtorAccount: debtor?.account,
      creditorName: creditor?.name,
      creditorAccount: creditor?.account,
      endToEndId: item.end_to_end_id,
      remittanceInformationUnstructured: references.join("\n"),
      _: item,
    };
  }

  async #authPost(uri: string, data?: any) {
    await this.postJSON(uri, data);

    const error = this.json.error;
    const idToken = this.json.id_token;
    const tft = this.json.token_meta?.twofactor_token;
    if (!tft) return { error, idToken };

    const path = `/auth-proxy/2fa/v1/token/${tft.id}/`;
    await this.withBearerAuthorization(idToken, () =>
      this.waitToAcceptCode(tft.short_code, async () => {
        await this.get(path);
        return this.json.state === "activated";
      })
    );
    return { error, idToken, path };
  }

  async #ibanBic(iban: string) {
    await this.get(`/iban/v1/${iban}/`);
    return this.json.bic;
  }
}
