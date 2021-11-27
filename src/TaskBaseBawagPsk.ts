import {
  AccountDetails,
  SepaCreditTransferPayment,
  Transaction,
} from "./Types";
import { Page, PageNode } from "./Page";
import {
  dateDMYToYMD,
  ifDefined,
  isSimilarWithoutWhitespace,
} from "./Utilities";
import { LoginError } from "./Errors";
import TaskBaseCheerio from "./TaskBaseCheerio";

const MAX_ROWS_PER_PAGE_WITH_BR_IN_BOOKING_TEXT = 90;

function toAmount(text: string, fallbackCurrency = "EUR") {
  const [amount, currency] = text.split(/\s+/);

  return {
    currency: currency || fallbackCurrency,
    amount: String(parseInt(amount.replace(/[^\d\-]/g, ""), 10) / 100),
  };
}

function parseTransaction(bookingText: string[], supplement?: string[]) {
  const lines = [...bookingText];
  let information = "";
  let creditorId = undefined;
  let mandateId = undefined;
  let endToEndId = undefined;

  if (supplement) {
    [creditorId, mandateId, endToEndId] = supplement[12]
      ?.split("/")
      ?.map((item) => item.trim());

    const m = supplement[22]?.match(
      /^(?<endToEndId>[^\s].{39}) \w{3}\-*(?<amount>\d+,\d{2})\s*$/
    );
    if (m) endToEndId = m.groups.endToEndId.trim();

    if (!endToEndId) {
      const text = [];
      for (let i = 6; i < 12; ++i) text.push(supplement[i]?.trim());
      endToEndId = text.join("\n").trim();
    }
  }

  while (lines.length) {
    const line = lines.shift();

    const groups = line.match(
      /^((?<text>.*) )?(?<type>[A-Z]{2})\/(?<id>\d{9})$/
    )?.groups;

    if (groups) {
      information += groups.text || "";
      const type = groups.type;
      const id = groups.id;

      const groups2 = lines[0]?.match(
        /^((?<bic>[A-Z]{6}[A-Z0-9]{2}[A-Z0-9]{3}?) )?(?<iban>[A-Z]{2}\d{2}[A-Z0-9]{1,30})( (?<name>.*))?$/
      )?.groups;
      const bic = groups2?.bic;
      const iban = groups2?.iban;
      let name = groups2?.name;

      if (groups2) {
        lines.shift();
        name ||= lines.shift();
      }

      information = [information.trim(), ...lines].join("\n").trim();
      if (isSimilarWithoutWhitespace(endToEndId, information))
        endToEndId = undefined;

      return {
        id,
        type,
        bic,
        iban,
        name,
        information,
        creditorId,
        mandateId,
        endToEndId,
      };
    }

    information += line;
  }
}

const toDate = dateDMYToYMD;

export default abstract class extends TaskBaseCheerio {
  static readonly CONFIGS = [...TaskBaseCheerio.CONFIGS];

  abstract get loginSvc();
  abstract get balancesSelector(): string;
  abstract get transactionTdIndices(): number[];

  override get authFields() {
    return ["disposernr", "pin"];
  }

  get #loginUrl() {
    return `/InternetBanking/InternetBanking?d=login&svc=${this.loginSvc}&ui=html&lang=de`;
  }

  async #submitForm(name: string, data: any) {
    return await this.submitForm(`[name="${name}"]`, data);
  }

  #formElements(name: string) {
    return this.page.formElements(`[name="${name}"]`);
  }

  override async login() {
    const [dn, pin] = this.auth;

    await this.get(this.#loginUrl);
    await this.#submitForm("loginForm", { dn, pin });
    const error = this.page.text("#error_part_text");
    if (error) throw new LoginError(error.trim());
    await this.get(this.responseHeaders.location);

    const scaLogin = this.page.text(".sca-login");
    if (scaLogin) {
      await this.logout();
      throw new LoginError(scaLogin);
    }
  }

  override async logout() {
    await this.#navigateTo("logoutredirect");
  }

  override async accountInfo(iban: string) {
    return iban.substr(-11);
  }

  async #navigateToDestinationPage(d: string, iban: string) {
    await this.#navigateTo("financeoverview");
    await this.#submitForm("financeOverviewForm", {
      d,
      activeaccount: await this.accountInfo(iban),
    });
  }

  async #navigateTo(d: string) {
    await this.#submitForm("navigationform", { d });
  }

  override async balancesForAccount(accountDetails: AccountDetails) {
    await this.#navigateToDestinationPage(
      "accountdetails",
      accountDetails.iban
    );

    const groups = this.page
      .text(this.balancesSelector)
      .match(
        /(?<expected>[0-9,\.]+\s+\w{3})\s+.*\(.*\s+(?<authorised>([0-9,\.])+\s+\w{3})/
      ).groups;

    return [
      {
        balanceAmount: toAmount(groups.expected),
        balanceType: "expected",
      },
      {
        balanceAmount: toAmount(groups.authorised),
        balanceType: "authorised",
      },
    ];
  }

  override async executeSepaCreditTransferPayments(
    payments: SepaCreditTransferPayment[]
  ) {
    for (const p of payments) {
      this.spinner(
        `Create payment for ${p.creditorName} (${p.instructedAmount.amount})`
      );

      await this.#navigateToDestinationPage(
        "domestictransfer",
        p.debtorAccount.iban
      );

      const amount = parseFloat(p.instructedAmount.amount) * 100;
      await this.#submitForm("transferform", {
        betrageur: amount / 100,
        betragcent: amount % 100,
        empfaenger: p.creditorName,
        iban: p.creditorAccount.iban,
        zref: p.remittanceInformationUnstructured,
        submitAndRedirectToOrderFolder: true,
      });
    }

    await this.#navigateTo("orderfolder");
    const items = this.page.map(".item", (node) => {
      return {
        name: node.attr("name", "input"),
        value: node.attr("value", "input"),
        amount: node.attr("data-amount", "input"),
        debtorIban: node
          .html("td:nth-of-type(4) div")
          .split("<br>")[0]
          .replace(/\s/g, ""),
        creditorIban: node
          .html("td:nth-of-type(6) div")
          .split("<br>")[1]
          .replace(/\s/g, ""),
        remittanceInformationUnstructured: node.text(
          "td:nth-of-type(6) div span"
        ),
      };
    });

    const data = {};
    for (const p of payments) {
      const item = items.find((item) => {
        return (
          item.debtorIban === p.debtorAccount.iban &&
          item.creditorIban === p.creditorAccount.iban &&
          parseFloat(item.amount) === parseFloat(p.instructedAmount.amount) &&
          isSimilarWithoutWhitespace(
            item.remittanceInformationUnstructured,
            p.remittanceInformationUnstructured
          )
        );
      });
      if (!item) throw new Error("Could not find payment");
      data[item.name] = item.value;
    }

    await this.#submitForm("transferform", data);

    const signingOptions = this.page.map(
      ".klar-popup section > div button",
      (el) => {
        return {
          text: el.text("div span strong"),
          value: el.attr("onclick")?.split("'")?.[1],
        };
      }
    );

    let itanRadio = signingOptions[0].value;
    if (signingOptions.length > 1)
      itanRadio = await this.promptOption("Signingmethod:", signingOptions);

    await this.#submitForm("transferform", {
      itanRadio,
      d: this.#formElements("transferform").d_unsignedordercheck,
    });

    const tanData = await this.prompt("TAN:", "Sign", (_) => {
      _.input(this.page.attr("name", "#tan"), "TAN");
    });
    await this.#submitForm("transferform", tanData);

    const error = this.page
      .text("#error_part_text")
      .split("\n")
      .map((x) => x.trim())
      .filter((x) => x)[1];
    if (error) throw new Error(error);
  }

  async #handleTransactionRow(node: PageNode) {
    const idx = this.transactionTdIndices;

    const ret = {
      bookingDate: node.text(`td:nth-of-type(${idx[0]})`),
      bookingTextx: node.html(`td:nth-of-type(${idx[1]})`),
      bookingText: node.html(`td:nth-of-type(${idx[1]})`)?.split("<br>"),
      valueDate: node.text(`td:nth-of-type(${idx[2]})`),
      amount: node.text(`td:nth-of-type(${idx[3]})`),
      supplement: undefined,
      image: undefined,
    };

    let url: URL;
    try {
      const onclick = node.attr("onclick", `td:nth-of-type(${idx[4]}) a`);
      const path = onclick?.split("'")?.[1];
      url = new URL(path, this.baseUrl);
    } catch (e) {}

    switch (url?.searchParams?.get("d")) {
      case "image": {
        const res = await this.request("GET", url.href);
        const page = new Page(res.body.toString());
        const imgSrc = page.attr("src", "body > div > img");
        const imgRes = await this.request("GET", imgSrc);
        ret.image = imgRes.body.toString("base64");
        break;
      }

      case "supplement": {
        const res = await this.request("GET", url.href);
        const page = new Page(res.body.toString());
        ret.supplement = page.map("td", (node) => node.text());
        break;
      }
    }

    return ret;
  }

  override async *rawTransactionsForAccount(accountDetails: AccountDetails) {
    await this.#navigateToDestinationPage("transactions", accountDetails.iban);
    await this.#submitForm("transactionSearchForm", {
      rowsPerPage: MAX_ROWS_PER_PAGE_WITH_BR_IN_BOOKING_TEXT,
    });
    await this.#navigateToDestinationPage("transactions", accountDetails.iban);

    for (const node of this.page.querySelectorAll(
      `table[cellspacing="0"] > tbody > tr`
    )) {
      yield this.#handleTransactionRow(node);
    }
  }

  override mapRawTransaction(item: any): Transaction {
    const details = parseTransaction(item.bookingText, item.supplement);
    const neg = item.amount[0] == "-";

    const partner = {
      name: ifDefined(details.name),
      account: details.iban ? { iban: details.iban } : undefined,
      agent: ifDefined(details.bic),
    };
    const debtor = neg ? null : partner;
    const creditor = neg ? partner : null;

    return {
      transactionId: details.id,
      entryReference: details.id,

      valueDate: toDate(item.valueDate),
      bookingDate: toDate(item.bookingDate),
      transactionAmount: toAmount(item.amount),

      debtorName: debtor?.name,
      debtorAccount: debtor?.account,
      debtorAgent: debtor?.agent,

      creditorName: creditor?.name,
      creditorAccount: creditor?.account,
      creditorAgent: creditor?.agent,

      creditorId: details.creditorId,
      mandateId: details.mandateId,
      endToEndId: details.endToEndId,

      remittanceInformationUnstructured: details.information,
      additionalInformation: item.supplement?.join("\n"),
      _: { bookingText: item.bookingText },
    };
  }
}
