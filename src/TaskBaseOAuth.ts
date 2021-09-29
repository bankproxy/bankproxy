import { InvalidStateError, MissingConfigurationError } from "./Errors";
import { addSearchParams, randomHexBytesAsync } from "./Utilities";
import TaskBaseHttp from "./TaskBaseHttp";

const CONFIG_KEY_OAUTH_CLIENT_ID = "OAuthClientId";
const CONFIG_KEY_OAUTH_CLIENT_SECRET = "OAuthClientSecret";
const CONFIG_KEY_REFRESH_TOKEN = "OAuthRefreshToken";

export default abstract class extends TaskBaseHttp {
  static readonly CONFIGS = [
    ...TaskBaseHttp.CONFIGS,
    CONFIG_KEY_OAUTH_CLIENT_ID,
    CONFIG_KEY_OAUTH_CLIENT_SECRET,
  ];

  #clientId: string;
  #clientSecret: string;

  get oauthBaseUrl(): string {
    throw new MissingConfigurationError("OAuth Base URL");
  }
  get oauthScope(): string {
    throw new MissingConfigurationError("OAuth Scope");
  }

  get oauthAuthorizeUrl() {
    return this.oauthBaseUrl + "/authorize";
  }
  get oauthTokenUrl() {
    return this.oauthBaseUrl + "/token";
  }
  get oauthClientId() {
    return this.#clientId;
  }
  get oauthClientSecret() {
    return this.#clientSecret;
  }

  protected override async loadConfig() {
    super.loadConfig();
    this.#clientId = await this.config(CONFIG_KEY_OAUTH_CLIENT_ID);
    this.#clientSecret = await this.config(CONFIG_KEY_OAUTH_CLIENT_SECRET);
  }

  protected async oauthToken(data: any) {
    await this.postForm(
      this.oauthTokenUrl,
      Object.assign(data, {
        client_id: this.oauthClientId,
        client_secret: this.oauthClientSecret,
        redirect_uri: this.callbackUri,
      })
    );
    const { access_token, error, error_description, refresh_token } = this.json;
    if (error)
      return new InvalidStateError(
        `OAuth error ${error}: ${error_description}`
      );
    if (!access_token)
      return new InvalidStateError("OAuth access_token is missing");

    await this.setUserConfig(CONFIG_KEY_REFRESH_TOKEN, refresh_token);
    this.setBearerAuthorization(access_token);
  }

  override async login() {
    const refresh_token = await this.userConfig(CONFIG_KEY_REFRESH_TOKEN);

    if (refresh_token) {
      const err = await this.oauthToken({
        grant_type: "refresh_token",
        refresh_token,
      });
      if (!err) return;
      await this.setUserConfig(CONFIG_KEY_REFRESH_TOKEN, null);
    }

    const state = await randomHexBytesAsync(32);

    const uri = addSearchParams(this.oauthAuthorizeUrl, {
      response_type: "code",
      client_id: this.oauthClientId,
      state,
      scope: this.oauthScope,
      redirect_uri: this.callbackUri,
    });

    const query = await this.callback(uri, "Get Access");
    if (query.searchParams.get("state") !== state)
      throw new InvalidStateError("OAuth state");
    const code = query.searchParams.get("code");

    this.spinner("Getting access_token...");
    const err = await this.oauthToken({
      grant_type: "authorization_code",
      code: code,
    });
    if (err) throw err;
  }
}
