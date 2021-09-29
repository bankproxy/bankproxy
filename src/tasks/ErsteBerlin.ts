import TaskBaseBerlin from "../TaskBaseBerlin";

const CONFIG_KEY_WEB_API_KEY = "WebApiKey";

export default class extends TaskBaseBerlin {
  static readonly CONFIGS = [...TaskBaseBerlin.CONFIGS];
  static readonly ID = "com.erstegroup.eboe";

  #configWebApiKey: string;

  protected override addRequestHeaders(headers: any, method: string) {
    super.addRequestHeaders(headers, method);
    if (this.httpsClientCertificateEnable && this.#configWebApiKey)
      headers["web-api-key"] = this.#configWebApiKey;
  }

  protected override async loadConfig() {
    await super.loadConfig();
    this.#configWebApiKey = await this.config(CONFIG_KEY_WEB_API_KEY);
  }

  override get oauthBaseUrl() {
    return "https://webapi.developers.erstegroup.com/api/eboe/sandbox/v1/sandbox-idp";
  }
  override get oauthAuthorizeUrl() {
    return this.oauthBaseUrl + "/auth";
  }

  override get baseUrl() {
    return "https://webapi.developers.erstegroup.com/api/eboe/sandbox/v1";
  }
  override get aisBaseUrl() {
    return "/psd2-accounts-api";
  }
  override get consentsBaseUrl() {
    return "/psd2-consent-api";
  }
  override get pisBaseUrl() {
    return "/psd2-payments-api";
  }
  override get piisBaseUrl() {
    return "/psd2-funds-confirmation-api";
  }

  override get oauthScope() {
    return "AISP";
  }
}
