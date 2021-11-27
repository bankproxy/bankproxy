import {
  AccountDetails,
  SepaCreditTransferPayment,
  Transaction,
} from "../Types";
import { ifDefined, randomHexBytesAsync, sha256hexdigest } from "../Utilities";
import TaskBaseCheerio from "../TaskBaseCheerio";
import { UnsupportedTypeError } from "../Errors";

function toAmount({ amount, currency }) {
  return {
    amount: String(amount),
    currency,
  };
}

export default class extends TaskBaseCheerio {
  static readonly CONFIGS = [...TaskBaseCheerio.CONFIGS];
  static readonly ID = "at.raiffeisen.elba";

  override get authFields() {
    return ["disposernr", "pin"];
  }

  get ssoBaseUrl() {
    return "https://sso.raiffeisen.at";
  }
  get apiBaseUrl() {
    return "https://mein.elba.raiffeisen.at/api";
  }
  get startUrl() {
    return "https://mein.elba.raiffeisen.at/pfp-widgetsystem/";
  }
  get loginApiBaseUrl() {
    return `${this.ssoBaseUrl}/api/bankingquer-kunde-login/kunde-login-ui/rest`;
  }

  apiPOST(path, data?: any) {
    return this.postJSON(this.apiBaseUrl + path, data);
  }

  apiGET(path, data?: any) {
    return this.get(this.apiBaseUrl + path, data);
  }

  loginApiPOST(path, data?: any) {
    return this.postJSON(this.loginApiBaseUrl + path, data);
  }

  loginApiPUT(path, data?: any) {
    return this.putJSON(this.loginApiBaseUrl + path, data);
  }

  loginApiGET(path) {
    return this.get(this.loginApiBaseUrl + path);
  }

  override async login() {
    const [disposernr, pin] = this.auth;
    const verfuegerNr = disposernr.toUpperCase().replace(/\-/g, "");

    await this.get(this.startUrl);
    const url = (this.text as any)
      .match(/window\.location\s*=\s*'([^']*)'/)[1]
      .replaceAll("\\/", "/")
      .replaceAll("\\x26", "&")
      .replaceAll("\\-", "-");
    await this.get(url);

    this.setOrigin(this.ssoBaseUrl);
    await this.page.submitForm("form");
    this.setOrigin(null);

    const pinHash = sha256hexdigest(pin);
    await this.loginApiPOST(`/identify/${verfuegerNr}/pin`, {
      pinHash,
    });

    const challengeType = this.json.challengeType;
    if (challengeType == "PUSH") {
      await this.loginApiPOST("/login/pushtan");
      const res = this.json;

      await this.waitToAcceptCode(res.displayText, async () => {
        await this.loginApiGET("/login/pushtan/" + res.signaturId);
        return this.json.loggedIn;
      });
    } else if (challengeType == "SMSPIN") {
      await this.loginApiPOST("/login/smstan");
      const res = this.json;

      const tfa = await this.prompt(res.displayText, "Auth", (_) => {
        _.input("tan", "TAN:");
      });

      await this.loginApiPUT("/login/smstan/" + res.signaturId, {
        pin: pinHash,
        smsTAN: tfa.tan,
      });
    } else throw new UnsupportedTypeError("challengeType ", challengeType);

    await this.loginApiPOST("/login", {
      updateSession: false,
      accounts: null,
    });

    await this.get(this.json.resumeUrl);
    await this.get(this.responseHeaders.location);

    const state = await randomHexBytesAsync(52);
    await this.get(this.ssoBaseUrl + "/as/authorization.oauth2", {
      response_type: "token",
      client_id: "DRB-PFP-RBG",
      scope: "edit",
      redirect_uri: this.startUrl,
      state,
    });

    await this.setAccessTokenFromLocationHeader();
  }

  override async executeSepaCreditTransferPayments(
    payments: SepaCreditTransferPayment[]
  ) {
    const paymentIds = [];
    for (const p of payments) {
      this.spinner(
        `Create payment for ${p.creditorName} (${p.instructedAmount.amount})`
      );
      if (paymentIds.length) await this.wait(1000);
      await this.apiPOST(
        "/pfp-pfm/auftrag-ui-services/rest/neuer-auftrag/erfassteAuftraege",
        {
          auftragsart: "SEPA",
          durchfuehrungsart: "EINZELAUFTRAG",
          empfaengerIban: p.creditorAccount.iban,
          empfaengerzeile1: p.creditorName,
          zahlungsreferenzOderVerwendungszweck:
            p.remittanceInformationUnstructured,
          auftraggeberIban: p.debtorAccount.iban,
          betrag: {
            currency: p.instructedAmount.currency,
            amount: parseFloat(p.instructedAmount.amount),
          },
        }
      );
      paymentIds.push(this.json);
    }

    const query = paymentIds.map((id) => "id=" + id).join("&");

    await this.apiPOST(
      "/pfp-pfm/auftrag-ui-services/rest/erfasster-auftrag-page-fragment/signaturen/erfassteAuftraege?" +
        query
    );

    const signaturId = this.json;

    await this.apiGET(
      `/quer-signatur/signatur-ui-services/rest/signaturen/${signaturId}/moeglicheverfahren`
    );

    const moeglicheverfahren = this.json;
    const verfahren = moeglicheverfahren[0];

    await this.apiPOST(
      `/quer-signatur/signatur-ui-services/rest/signaturen/${signaturId}/${verfahren}/start`
    );

    this.spinner(`Please sign payments`);
    await this.wait(3000);
    await this.waitUntil(async () => {
      await this.apiPOST(
        `/quer-signatur/signatur-ui-services/rest/signaturen/${signaturId}/${verfahren}/verify`
      );
      return this.json;
    });

    await this.apiPOST(
      `/pfp-pfm/auftrag-ui-services/rest/erfasster-auftrag-page-fragment/gesendeteAuftraege/ausErfassten?${query}&signaturId=${signaturId}`
    );

    this.spinner(`Waiting before getting transactions`);
    await this.wait(30000);
  }

  override async balancesForAccount(accountDetails: AccountDetails) {
    await this.apiGET("/pfp-konto/konto-ui-services/rest/kontobetraege", {
      iban: accountDetails.iban,
    });
    const kontobetrag = this.json[accountDetails.iban];
    return [
      {
        balanceAmount: toAmount(kontobetrag.kontostand),
        balanceType: "expected",
      },
      {
        balanceAmount: toAmount(kontobetrag.verfuegbarerBetrag),
        balanceType: "?1?",
      },
      {
        balanceAmount: toAmount(
          kontobetrag.verfuegbarerBetragInklNichtBeurkundetemRahmen
        ),
        balanceType: "?2?",
      },
    ];
  }

  override async *rawTransactionsForAccount(accountDetails: AccountDetails) {
    const token = (accountDetails.entryReferenceFrom || "").split("@");
    await this.apiPOST(
      "/pfp-umsatz/umsatz-ui-services/rest/umsatz-page-fragment/umsaetze",
      {
        predicate: {
          ibans: [accountDetails.iban],
          buchungVon: token[1],
        },
      }
    );
    let umsaetze = this.json;
    const tokenId = parseInt(token[0], 10);
    if (tokenId) umsaetze = umsaetze.filter((t) => t.id > tokenId);

    for (const item of umsaetze) yield item;
  }

  override mapRawTransaction(item: any): Transaction {
    const { amount } = item.betrag;
    const reference = [
      item.zahlungsreferenz,
      item.verwendungszweckZeile1,
      item.verwendungszweckZeile2,
    ]
      .filter((x) => x !== "")
      .join(" ")
      .trim();

    const partner = {
      name: ifDefined(item.transaktionsteilnehmerZeile1),
      address1: ifDefined(item.transaktionsteilnehmerZeile2),
      address2: ifDefined(item.transaktionsteilnehmerZeile3),
      account: item.auftraggeberIban
        ? { iban: item.auftraggeberIban }
        : undefined,
      agent: ifDefined(item.auftraggeberBic),
    };

    const debtor = amount < 0 ? null : partner;
    const creditor = amount < 0 ? partner : null;

    return {
      transactionId: String(item.id),
      entryReference: `${item.id}@${item.buchungstag}T00:00:00`,

      valueDate: item.valuta,
      bookingDate: item.buchungstag,
      transactionAmount: toAmount(item.betrag),

      debtorName: debtor?.name,
      debtorAccount: debtor?.account,
      debtorAgent: debtor?.agent,

      creditorName: creditor?.name,
      creditorAccount: creditor?.account,
      creditorAgent: creditor?.agent,
      creditorId: ifDefined(item.empfaengerkennung),
      mandateId: ifDefined(item.mandatsreferenz),

      remittanceInformationUnstructured: reference,
      _: item,
    };
  }
}
