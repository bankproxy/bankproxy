import * as ibantools from "ibantools";
import * as playwright from "playwright";
import { AccountDetails, Transaction } from "../Types";
import TaskBasePlaywright from "../TaskBasePlaywright";
import { dateDMYToYMD } from "../Utilities";

function toAmount(amount: string, currency = "EUR") {
  return {
    currency,
    amount: String(parseInt(amount.replace(/[^\d\-]/g, ""), 10) / 100),
  };
}

const toDate = dateDMYToYMD;

export default class extends TaskBasePlaywright {
  static readonly CONFIGS = [...TaskBasePlaywright.CONFIGS];
  static readonly ID = "at.sparda.banking";

  override get authFields() {
    return ["username", "password"];
  }

  async #handleRow(handle: playwright.ElementHandle) {
    const ret = {
      ri: await handle.evaluate((node: any) => node.dataset.ri),
    };

    await handle.click();
    await this.waitForSelector(".modal-content");

    const xx = {
      empfaengerName: ".umsatzdetails-empfaenger .kontakt-details-name",
      empfaengerIban: ".umsatzdetails-empfaenger .iban",
      betrag: ".umsatzdetails-betrag .value",
      verwendungszweck: ".umsatzdetails-verwendungszweck .umsatzdetails-value",
      zahlungsreferenz: ".umsatzdetails-zahlungsreferenz .umsatzdetails-value",
      auftraggeberreferenz:
        ".umsatzdetails-auftraggeberreferenz .umsatzdetails-value",
      mandatsId: ".umsatzdetails-mandats-id .umsatzdetails-value",
      mandatsDatum: ".umsatzdetails-mandats-datum .umsatzdetails-value",
      creditorId: ".umsatzdetails-creditor-id .umsatzdetails-value",
      buchungstext: ".umsatzdetails-buchungstext .umsatzdetails-value",
      buchungstag: ".umsatzdetails-buchungstag .umsatzdetails-value",
      wertstellung: ".umsatzdetails-wertstellung .umsatzdetails-value",
      kontoauszugsnummer:
        ".umsatzdetails-kontoauszugsnummer .umsatzdetails-value",
    };

    for (const [k, v] of Object.entries(xx)) {
      ret[k] = await this.textContent(this.$(v));
    }

    await this.click(".modal-content .overlay-close-button");
    await this.wait(500);

    return ret;
  }

  override async login() {
    const [username, password] = this.auth;

    this.spinner("Opening Bank");
    await this.goto("https://banking.sparda.at/");

    this.spinner("Logging in (username) ...");
    await this.type('[id="loginform:benutzername"]', username);
    await this.click('[id="loginform:loginButtonNext"]');
    await this.waitForLoadState("load");

    this.spinner("Logging in (password) ...");
    await this.type('[id="loginform:password2c"]', password);
    await this.click('[id="loginform:loginButton"]');
    await this.waitForLoadState("load");

    const challenge = await this.textContent(".challenge-content");
    this.spinner(`Plase accept challenge ${challenge}`);

    await this.click('[id="gbform:create-gb-switch:switch:0"]', {
      force: true,
      timeout: 5 * 60 * 1000,
    });

    this.spinner("Logging in (final) ...");
    await this.click('[id="gbform:ignore-aks-again"]');
    await this.waitForLoadState("load");
  }

  override async logout() {
    await this.click("a.topbar-logout");
    await this.waitForLoadState("load");
  }

  override async accountInfos(ibans: string[]) {
    return ibans.map((iban) => iban.substr(9));
  }

  override async balancesForAllAccounts(
    accountDetails: AccountDetails[]
  ): Promise<any[]> {
    this.spinner("Loading finanzuebersicht");
    await this.wait(1000);
    await this.goto("https://banking.sparda.at/banking/finanzuebersicht");
    await this.waitForLoadState("load");

    const map = new Map<string, string>();

    for (const row of await this.$$('[role="gridcell"].produktColumn')) {
      const iban = await this.textContent(row.$(".iban"));
      const balance = await this.textContent(
        row.$(".konto-uebersicht-aktueller-saldo > p > span > .value")
      );
      map.set(ibantools.electronicFormatIBAN(iban), balance);
    }

    return accountDetails.map(({ iban }) => {
      const item = map.get(iban);
      if (!item) return;
      return [
        {
          balanceAmount: toAmount(item),
          balanceType: "expected",
        },
      ];
    });
  }

  override async *rawTransactionsForAccount(accountDetails: AccountDetails) {
    this.spinner("Loading dashboard ...");
    await this.wait(1000);
    await this.goto("https://banking.sparda.at/banking/dashboard");
    await this.waitForLoadState("load");
    await this.wait(1000);
    await this.click(`.produkt[data-produktnr="${accountDetails.info}"]`);
    await this.waitForLoadState("load");
    await this.wait(1000);

    this.spinner("Getting transactions ...");

    let i = 0;
    while (this.clientConnected) {
      const rowElements = await this.$$(
        '[id="content:kontenumsaetze-tab:form:kontoUmsaetze:umsatzTable:table_data"] [role="row"].ui-datatable-clickable'
      );
      const rowElement = rowElements[i];
      if (!rowElement) {
        const loadmore = await this.$(".loadmore button");
        if (loadmore) {
          this.spinner(`Loading more elements...`);
          try {
            await loadmore.click({ force: true });
            await this.wait(2000);
            continue;
          } catch (ex) {
            console.dir(ex);
          }
        }
        break;
      }

      this.spinner(`Handle row ${i + 1} of ${rowElements.length}`);

      try {
        const row = await this.#handleRow(rowElement);
        if (!row) return;
        yield row;
        ++i;
      } catch (ex) {
        console.warn(ex);
        this.spinner(`Waiting to retry row ${i + 1}`);
        await this.wait(500);
      }
    }
  }

  override mapRawTransaction(item: any): Transaction {
    const neg = item.betrag[0] == "-";
    const partnerName = item.empfaengerName?.split("\n")[1];
    const partnerAccount = {
      iban: ibantools.electronicFormatIBAN(item.empfaengerIban),
    };
    return {
      transactionId: item.ri,
      entryReference: item.ri,
      valueDate: toDate(item.wertstellung),
      bookingDate: toDate(item.buchungstag),
      transactionAmount: toAmount(item.betrag),

      debtorName: !neg ? partnerName : undefined,
      debtorAccount: !neg ? partnerAccount : undefined,
      creditorName: neg ? partnerName : undefined,
      creditorAccount: neg ? partnerAccount : undefined,
      creditorId: item.creditorId,
      mandateId: item.mandatsId,

      remittanceInformationUnstructured:
        item.zahlungsreferenz || item.verwendungszweck,
      additionalInformation: item.Buchungstext,
      _: item,
    };
  }
}
