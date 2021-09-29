export interface Account {
  iban: string;
  dateFrom: string;
  dateTo: string;
  entryReferenceFrom: string;
}

export interface AccountDetails extends Account {
  info: any;
}

export interface Transactions {
  account: { iban: string };
  balances: any[];
  transactions: { booked: Transaction[] };
}

export interface Transaction {
  transactionId: string;
  entryReference?: string;
  endToEndId?: string;
  mandateId?: string;
  checkId?: string;
  creditorId?: string;
  bookingDate?: string;
  valueDate?: string;
  transactionAmount: {
    currency: string;
    amount: string;
  };
  currencyExchange?: any[];
  creditorName?: string;
  creditorAgent?: string;
  creditorAccount?: { iban: string };
  ultimateCreditor?: string;
  debtorName?: string;
  debtorAgent?: string;
  debtorAccount?: { iban: string };
  ultimateDebtor?: string;
  remittanceInformationUnstructured?: string;
  remittanceInformationStructured?: any;
  additionalInformation?: string;
  purposeCode?: string;
  bankTransactionCode?: string;
  proprietaryBankTransactionCode?: string;
  _?: any;
}

export interface SepaCreditTransferPayment {
  endToEndIdentification?: string;
  debtorAccount: {
    iban: string;
  };
  instructedAmount: {
    currency: string;
    amount: string;
  };
  creditorAccount: {
    iban: string;
  };
  creditorAgent?: string;
  creditorAgentName?: string;
  creditorName: string;
  remittanceInformationUnstructured?: string;
}
