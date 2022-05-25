import * as tough from "tough-cookie";
import { HttpsResponse, httpsRequest } from "./HttpsRequest";
import { addSearchParams, querystringStringify } from "./Utilities";
import { MissingConfigurationError } from "./Errors";
import TaskBaseImpl from "./TaskBaseImpl";
import { v4 as uuidv4 } from "uuid";

const USER_AGENT = "Mozilla/5.0";

export default abstract class extends TaskBaseImpl {
  static readonly CONFIGS = [...TaskBaseImpl.CONFIGS];
  #httpsClientCert?: Buffer;
  #httpsClientKey?: Buffer;
  #httpsClientAuthorization?: string;
  #httpsClientOrigin?: string;
  public httpsClientCertificateEnable = false;
  protected httpsClientCookieJar = new tough.CookieJar();
  #lastHttpsClientResponse?: HttpsResponse;

  get baseUrl(): string {
    throw new MissingConfigurationError("Base URL");
  }

  get responseHeaders() {
    return this.raw.headers;
  }

  get responseStatusCode() {
    return this.raw.statusCode;
  }

  get raw() {
    return this.#lastHttpsClientResponse;
  }

  get text() {
    const body = this.raw.body;
    return body.toString();
  }

  get json() {
    return JSON.parse(this.text);
  }

  setOrigin(origin: string) {
    this.#httpsClientOrigin = origin;
  }
  setBearerAuthorization(token: string) {
    this.#httpsClientAuthorization = `Bearer ${token}`;
  }
  async withBearerAuthorization<T>(token: string, fn: () => T | Promise<T>) {
    const old = this.#httpsClientAuthorization;
    this.setBearerAuthorization(token);
    const ret = await fn();
    this.#httpsClientAuthorization = old;
    return ret;
  }

  async setAccessTokenFromLocationHeader() {
    const token = this.responseHeaders.location?.split("#");
    const params = new URLSearchParams(token[1]);
    this.setBearerAuthorization(params.get("access_token"));
  }

  protected setClientCertificate(cert: Buffer, key: Buffer) {
    this.#httpsClientCert = cert;
    this.#httpsClientKey = key;
  }

  protected enableClientCertificate(value = true) {
    this.httpsClientCertificateEnable = value;
  }

  protected addRequestHeaders(_headers: any, _method: string) {}

  async delete(uri: string) {
    return this.#request("DELETE", uri);
  }
  async get(uri: string, query?: any) {
    return this.#request("GET", addSearchParams(uri, query));
  }
  async postForm(uri: string, body?: any) {
    return this.#request("POST", uri, body, false);
  }
  async postJSON(uri: string, body?: any) {
    return this.#request("POST", uri, body, true);
  }
  async putJSON(uri: string, body?: any) {
    return this.#request("PUT", uri, body, true);
  }

  async #request(
    method: "DELETE" | "GET" | "POST" | "PUT",
    url: string,
    body?: any,
    asJSON?: boolean
  ): Promise<any> {
    this.#lastHttpsClientResponse = await this.request(
      method,
      url,
      body,
      asJSON
    );
  }

  async request(
    method: "DELETE" | "GET" | "POST" | "PUT",
    url: string,
    body?: any,
    asJSON?: boolean
  ) {
    if (url[0] === "/") url = this.baseUrl + url;
    const options = {
      method,
      headers: {
        Accept: "application/json,*/*",
        Connection: "close",
        "Cache-Control": "no-cache",
        "User-Agent": USER_AGENT,
        "X-Request-ID": uuidv4(),
      },
      cert: this.httpsClientCertificateEnable && this.#httpsClientCert,
      key: this.httpsClientCertificateEnable && this.#httpsClientKey,
    };

    const cookie = await this.httpsClientCookieJar.getCookieString(url);
    if (cookie) options.headers["Cookie"] = cookie;

    if (this.#httpsClientAuthorization)
      options.headers["Authorization"] = this.#httpsClientAuthorization;

    if (this.#httpsClientOrigin)
      options.headers["Origin"] = this.#httpsClientOrigin;

    if (asJSON) options.headers["Content-Type"] = "application/json";

    let bdy: Buffer = null;
    if (body) {
      const fn = asJSON ? JSON.stringify : querystringStringify;
      bdy = Buffer.from(fn(body));
      if (!asJSON)
        options.headers["Content-Type"] = "application/x-www-form-urlencoded";
    }

    this.addRequestHeaders(options.headers, method);

    const res = await httpsRequest(this.log, url, options, bdy);

    const cookieHeaders = res.headers["set-cookie"] || [];
    await Promise.all(
      cookieHeaders.map((cookie) =>
        this.httpsClientCookieJar.setCookie(cookie, url)
      )
    );

    return res;
  }
}
