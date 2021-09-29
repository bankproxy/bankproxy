import ContentBuilder from "./ContentBuilder";
import { HeadlessError } from "./Errors";
import TaskUI from "./TaskUI";

export default class extends TaskUI {
  override get clientConnected() {
    return true;
  }

  override spinner(_text: string): void {}

  override callback(_url: string, _text: string): Promise<URL> {
    throw new HeadlessError("Headless");
  }

  override prompt(
    _title: string,
    _submit: string,
    _fn: (builder: ContentBuilder) => void
  ): Promise<any> {
    throw new HeadlessError("Headless");
  }

  override wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
