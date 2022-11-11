import TaskBaseBawagPsk from "../TaskBaseBawagPsk";

export default class extends TaskBaseBawagPsk {
  static readonly CONFIGS = [...TaskBaseBawagPsk.CONFIGS];
  static readonly ID = "com.bawag.ebanking";

  override get baseUrl() {
    return "https://ebanking.bawagpsk.com";
  }

  override get loginSvc() {
    return "BAWAG";
  }

  override get balancesSelector() {
    return "#account_details_form .kontodetails-wrap label:nth-of-type(8)";
  }

  override get transactionTdIndices() {
    return [1, 2, 3, 5, 6];
  }
}
