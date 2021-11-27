import TaskBaseBawagPsk from "../TaskBaseBawagPsk";

export default class extends TaskBaseBawagPsk {
  static readonly CONFIGS = [...TaskBaseBawagPsk.CONFIGS];
  static readonly ID = "at.easybank.ebanking";

  override get baseUrl(): string {
    return "https://ebanking.easybank.at";
  }

  override get loginSvc() {
    return "EASYBANK";
  }

  override get balancesSelector() {
    return "#standing-order-new tr:nth-of-type(3) .input-template";
  }

  override get transactionTdIndices() {
    return [2, 4, 6, 10, 12];
  }
}
