import * as WebSocket from "ws";
import { ConnectionClosedError } from "./Errors";
import ContentBuilder from "./ContentBuilder";
import TaskUI from "./TaskUI";

const PING_INTERVAL = 10000;

export default class extends TaskUI {
  readonly #ws;
  readonly #handlers = new Map<string, (value) => void>();
  #closedCb: any = null;
  #closed = false;

  constructor(req: any, ws: WebSocket) {
    super(req);
    this.#ws = ws;

    let alive = true;
    const interval = setInterval(() => {
      if (!alive) return ws.terminate();
      alive = false;
      ws.ping("");
    }, PING_INTERVAL);

    ws.on("pong", () => {
      alive = true;
    });

    ws.on("close", () => {
      clearInterval(interval);
      this.#handleClose();
    });

    ws.on("message", (message: string) => {
      this.#handleMessage(JSON.parse(message));
    });
  }

  override get clientConnected() {
    return !this.#closed;
  }

  #handleMessage(obj: any) {
    for (const key of Object.getOwnPropertyNames(obj))
      this.#handlers.get(key)?.(obj[key]);
  }

  #handleClose() {
    this.#closed = true;
    this.#closedCb?.();
  }

  #send(data) {
    if (!this.#closed) this.#ws.send(JSON.stringify(data));
  }

  #sendContent(fn: (builder: ContentBuilder) => void) {
    const builder = new ContentBuilder();
    fn(builder);
    this.#send({ content: builder.lines });
  }

  #untilNotClosed<T>(
    executor: (
      resolve: (value: T | PromiseLike<T>) => void,
      reject: (reason?: any) => void,
      onClose: (fn: () => void) => void
    ) => void
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.#closed)
        return reject(new ConnectionClosedError("Already closed"));

      let onClose: () => void = null;
      const resolve2 = (value) => {
        this.#closedCb = null;
        resolve(value);
      };
      const reject2 = (reason?: any) => {
        this.#closedCb = null;
        reject(reason);
      };

      this.#closedCb = () => {
        onClose?.();
        reject2(new ConnectionClosedError("Closed"));
      };

      executor(resolve2, reject2, (fn) => {
        onClose = fn;
      });
    });
  }

  #waitForMessage<T>(name: string, fn: (value: any) => T): Promise<T> {
    return this.#untilNotClosed((resolve, reject) => {
      this.#handlers.clear();
      this.#handlers.set(name, (data: any) => {
        try {
          this.#closedCb = null;
          resolve(fn(data));
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  override spinner(text?: string) {
    this.#sendContent((_) => {
      _.spinner();
      if (text) _.text(text);
    });
  }

  override callback(url: string, text: string): Promise<URL> {
    const ret = this.#waitForMessage<URL>(
      "callback",
      (value) => new URL(value)
    );
    this.#sendContent((_) => {
      _.link(url, text);
    });
    return ret;
  }

  override prompt(
    title: string,
    submit: string,
    fn: (builder: ContentBuilder) => void
  ): Promise<any> {
    const ret = this.#waitForMessage("form", (value) => value.data);
    this.#sendContent((_) => {
      _.text(title);
      fn(_);
      _.submit(submit);
    });
    return ret;
  }

  override promptOption(
    title: string,
    options: { value: string; text?: string }[]
  ): Promise<string> {
    const ret = this.#waitForMessage("form", (value) => value.submitter);
    this.#sendContent((_) => {
      _.text(title);
      for (const option of options) {
        _.submit(option.text, option.value);
      }
    });
    return ret;
  }

  override wait(ms: number): Promise<void> {
    return this.#untilNotClosed((resolve, _reject, onClose) => {
      const timeout = setTimeout(() => resolve(null), ms);
      onClose(() => clearTimeout(timeout));
    });
  }

  redirect(redirect: string) {
    this.#send({ redirect });
  }

  get(key: string) {
    const ret = this.#waitForMessage<string>("get", (value) => value[key]);
    this.#send({ get: { key } });
    return ret;
  }

  set(key: string, value: string) {
    this.#send({ set: { key, value } });
  }
}
