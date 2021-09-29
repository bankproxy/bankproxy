import * as playwright from "playwright";
import TaskBaseImpl from "./TaskBaseImpl";

const BROWSER_TYPE = "chromium";

export default abstract class extends TaskBaseImpl {
  static readonly CONFIGS = [...TaskBaseImpl.CONFIGS];

  #browser: playwright.Browser;
  #page: playwright.Page;

  override async setup() {
    this.spinner("Opening Browser...");
    this.#browser = await playwright[BROWSER_TYPE].launch();
    this.#page = await this.#browser.newPage();
  }

  override async cleanup() {
    this.spinner("Closing Browser...");
    await this.#browser.close();
  }

  protected click(selector: string, options?) {
    return this.#page.click(selector, options);
  }

  protected type(selector: string, text: string) {
    return this.#page.type(selector, text);
  }

  protected async waitForSelector<T>(
    selectorOrElement:
      | string
      | playwright.ElementHandle<Node>
      | Promise<playwright.ElementHandle<Node>>,
    fn?: (ele: playwright.ElementHandle<Element>) => T
  ): Promise<T> {
    let ele = null;
    if (typeof selectorOrElement === "string") {
      ele = await this.#page.waitForSelector(selectorOrElement);
    } else {
      ele = await selectorOrElement;
    }
    if (fn && ele) return await fn(ele);
  }

  protected waitForSelectorAndClick(selector: string) {
    return this.waitForSelector(selector, (ele) => ele.click());
  }

  protected goto(url: string) {
    return this.#page.goto(url);
  }

  protected $(selector: string) {
    return this.#page.$(selector);
  }

  protected $$(selector: string) {
    return this.#page.$$(selector);
  }

  protected async textContent(
    selectorOrElement:
      | string
      | playwright.ElementHandle<Node>
      | Promise<playwright.ElementHandle<Node>>
  ): Promise<string> {
    return await this.waitForSelector(selectorOrElement, async (ele) => {
      const ret = await ele.innerText();
      return ret.trim();
    });
  }

  protected async waitForLoadState(state: "load" | "networkidle") {
    return this.#page.waitForLoadState(state);
  }
}
