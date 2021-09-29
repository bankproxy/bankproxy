import * as ibantools from "ibantools";
import * as playwright from "playwright";
import { AccountDetails, Transaction } from "../Types";
import { containsOnlyNumbers, dateDMYToYMD } from "../Utilities";
import TaskBasePlaywright from "../TaskBasePlaywright";

function toAmount(text: string) {
  let [amount, currency] = text.split(/\s+/);
  amount = String(parseInt(amount.replace(/[^\d\-]/g, ""), 10) / 100);
  return {
    currency,
    amount,
  };
}

const toDate = dateDMYToYMD;

function toAccount(name: string, iban: string, agent: string) {
  if (containsOnlyNumbers(iban) && containsOnlyNumbers(agent)) {
    const blz = parseInt(agent, 10);
    iban = ibantools.composeIBAN({
      countryCode: "AT",
      bban: String(blz).padStart(5, "0") + iban,
    });
    agent = undefined;
  }

  return {
    name,
    account: {
      iban: ibantools.electronicFormatIBAN(iban),
    },
    agent,
  };
}

export default class extends TaskBasePlaywright {
  static readonly CONFIGS = [...TaskBasePlaywright.CONFIGS];
  static readonly ID = "at.oberbank.banking";

  override get authFields() {
    return ["disposernr", "pin"];
  }

  async #handleRow(handle: playwright.ElementHandle) {
    await handle.click();
    const waiter = this.wait(200);

    const id = await handle.getAttribute("id");
    const oid = await handle.$("[data-oid]");
    const columnWrapper = await handle.$(".column-wrapper");

    const ret = {
      oid: await oid.evaluate((node: any) => node.dataset.oid),
      col1: await this.textContent(columnWrapper.$(".col-1")),
      col2: await this.textContent(columnWrapper.$(".col-2")),
      col3: await this.textContent(columnWrapper.$(".col-3")),
      col4: await this.textContent(columnWrapper.$(".col-4")),
    };

    await waiter;
    await this.waitForSelector(
      `[id="${id}"] .turnover-content`,
      async (ele) => {
        const items = await ele.$$(".column-wrapper");
        await Promise.all(
          items.map(async (row) => {
            const key = await this.textContent(row.$(".col-1"));
            const value = await this.textContent(row.$(".col-3"));
            ret[key] = value;
          })
        );
      }
    );

    return ret;
  }

  override async login() {
    const [disposernr, pin] = this.auth;

    this.spinner("Opening Bank");
    await this.goto("https://www.banking-oberbank.at/");

    await this.type("input.loginDisposer", disposernr);
    await this.type("input.loginPin", pin);
    this.spinner("Logging in...");
    await this.click("input.bwc-db-login-btn");
    await this.waitForLoadState("load");
  }

  override async logout() {
    this.spinner("Logging out...");
    await this.click(".db-meta-navigation-action--logout");
    await this.waitForLoadState("load");
  }

  override async accountInfos(ibans: string[]) {
    return ibans.map((iban) => iban.substr(10));
  }

  override async balancesForAllAccounts(
    accountDetails: AccountDetails[]
  ): Promise<any[]> {
    this.spinner("Loading accountdetails");
    await this.goto("https://www.banking-oberbank.at/group/oberbank/finanzen");

    const map = new Map<string, [string, string]>();

    await this.waitForSelector(".account-list.Konten", async (konten) => {
      for (const row of await konten.$$(".row-head")) {
        const iban = await this.textContent(row.$(".col-2"));
        const available = await this.textContent(row.$(".col-3"));
        const balance = await this.textContent(row.$(".col-4"));

        map.set(ibantools.electronicFormatIBAN(iban), [available, balance]);
      }
    });

    return accountDetails.map(({ iban }) => {
      const item = map.get(iban);
      if (!item) return;
      return [
        {
          balanceAmount: toAmount(item[0]),
          balanceType: "interimAvailable",
        },
        {
          balanceAmount: toAmount(item[1]),
          balanceType: "authorised",
        },
      ];
    });
  }

  override async *rawTransactionsForAccount(accountDetails: AccountDetails) {
    this.spinner("Loading accountdetails");
    await this.goto(
      `https://www.banking-oberbank.at/group/oberbank/accountdetails?accountID=${accountDetails.info}`
    );

    let i = 1;
    const rowElements = await this.$$('[id$=":turnover-wrapper"]');
    for (const rowElement of rowElements) {
      this.spinner(`Handle row ${i++} of ${rowElements.length}`);

      const row = await this.#handleRow(rowElement);
      if (row) yield row;
    }
  }

  override mapRawTransaction(item: any): Transaction {
    const creditor = toAccount(item.Nach, item.IBAN, item["BIC/BLZ"]);
    let debtor = null;
    if (item.Von) {
      const [name, acc] = item.Von?.split("\n");
      const [bic, iban] = acc.split(/\s*\-\s*/);
      debtor = toAccount(name, iban, bic);
    }

    return {
      transactionId: item.oid,
      entryReference: item.oid,
      valueDate: toDate(item.col1),
      bookingDate: toDate(item.col2),
      transactionAmount: toAmount(item.col4),

      debtorName: debtor?.name,
      debtorAccount: debtor?.account,
      debtorAgent: debtor?.agent,

      creditorName: creditor?.name,
      creditorAccount: creditor?.account,
      creditorAgent: creditor?.agent,

      remittanceInformationUnstructured: item.Verwendungszweck,
      additionalInformation: item.Buchungstext,
      _: item,
    };
  }
}
