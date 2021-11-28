import ContentBuilder from "./ContentBuilder";

export default abstract class {
  #req: any;

  constructor(req: any) {
    this.#req = req;
  }

  abstract get clientConnected(): boolean;

  get ipAddress() {
    return (
      this.#req.headers["x-forwarded-for"] || this.#req.socket.remoteAddress
    );
  }

  get ipPort() {
    return this.#req.headers["x-forwarded-port"] || this.#req.socket.remotePort;
  }

  get userAgent() {
    return this.#req.headers["user-agent"];
  }

  abstract spinner(text: string): void;

  abstract callback(url: string, text: string): Promise<URL>;

  abstract prompt(
    title: string,
    submit: string,
    fn: (builder: ContentBuilder) => void
  ): Promise<any>;

  abstract promptOption(
    title: string,
    options: { value: string; text?: string }[]
  ): Promise<string>;

  abstract wait(ms: number): Promise<void>;
}
