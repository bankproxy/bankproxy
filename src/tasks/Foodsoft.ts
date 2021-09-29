import { AccountDetails, Transaction } from "../Types";
import TaskBaseOAuth from "../TaskBaseOAuth";

const CONFIG_KEY_INSTANCE_URL = "InstanceUrl";

function toAmount(amount: number) {
  return {
    currency: "EUR",
    amount: String(amount),
  };
}

export default class extends TaskBaseOAuth {
  static readonly CONFIGS = [...TaskBaseOAuth.CONFIGS, CONFIG_KEY_INSTANCE_URL];
  static readonly ID = "net.foodcoops.foodsoft";

  #configInstanceUrl: string;

  override get baseUrl(): string {
    return this.#configInstanceUrl;
  }
  override get oauthBaseUrl(): string {
    return this.baseUrl + "/oauth";
  }
  override get oauthScope(): string {
    return "offline_access finance:user";
  }

  protected override async loadConfig() {
    super.loadConfig();
    this.#configInstanceUrl = await this.config(CONFIG_KEY_INSTANCE_URL);
  }

  override async *rawTransactionsForAccount(accountDetails: AccountDetails) {
    for (let page = 0; ; ++page) {
      await this.get("/api/v1/user/financial_transactions", {
        per_page: 100,
        page,
        "q[s]": "id desc",
        "q[id_gt]": accountDetails.entryReferenceFrom,
      });
      const transactions = this.json.financial_transactions;
      if (!transactions.length) break;
      for (const item of transactions) yield item;
    }
  }

  override mapRawTransaction(item: any): Transaction {
    const date = item.created_at.substr(0, 10);
    const name = item.financial_transaction_type_name;

    return {
      transactionId: String(item.id),
      entryReference: String(item.id),
      valueDate: date,
      bookingDate: date,
      transactionAmount: toAmount(item.amount),
      debtorName: item.amount < 0 ? undefined : name,
      creditorName: item.amount < 0 ? name : undefined,
      remittanceInformationUnstructured: item.note,
      _: item,
    };
  }
}
