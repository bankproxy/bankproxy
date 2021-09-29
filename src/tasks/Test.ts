import { AccountDetails } from "../Types";
import TaskBaseImpl from "../TaskBaseImpl";

export default class extends TaskBaseImpl {
  static readonly CONFIGS = [...TaskBaseImpl.CONFIGS];
  static readonly ID = "com.example.test";
  #runHeadless: boolean;

  protected override async loadConfig() {
    super.loadConfig();
    this.#runHeadless = !!(await this.config("Headless"));
  }

  override get authFields() {
    if (this.#runHeadless) return [];
    return ["username", "password"];
  }

  override async balancesForAccount(_accountDetails: AccountDetails) {
    return [];
  }

  override async bookedTransactionsForAccount(_accountDetails: AccountDetails) {
    if (!this.#runHeadless) {
      const url = await this.callback(
        `${this.callbackUri}?param=1234`,
        `auth=${this.auth[0]}:${this.auth[1]}`
      );

      this.spinner(`urlparam=${url.searchParams.get("param")}`);
      await this.wait(1000);

      await this.callback(`${this.callbackUri}`, "DONE");
    }

    return [
      {
        transactionAmount: {
          currency: "EUR",
          amount: "136.47",
        },
        debtorAccount: {
          iban: "AT251657674147449499",
        },
        debtorName: "Maria Reithuber",
        remittanceInformationUnstructured: "Danke für's Auslegen",
        endToEndId: "Auslage von Martin S.",
        bookingDate: "2019-02-14",
        valueDate: "2019-02-14",
        entryReference: "4856465768967584736",
        transactionId: "4856465768967584736",
        bankTransactionCode: "PMNT-RCDT-ESCT",
        additionalInformation: "Gutschrift",
      },
    ];
  }
}
