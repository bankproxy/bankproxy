import * as cheerio from "cheerio";
import TaskBaseHttp from "./TaskBaseHttp";

class Page {
  #task: TaskBaseHttp;
  #root: cheerio.CheerioAPI;

  constructor(task: TaskBaseHttp) {
    this.#task = task;
    this.#root = cheerio.load(task.text);
  }

  #formHelper(selector: string) {
    const ele = this.#root(selector);
    if (!ele.length) return [];
    const ret: any = {};
    ele.serializeArray().forEach((item) => {
      ret[item.name] = item.value;
    });
    return [ele, ret];
  }

  formElements(selector: string) {
    return this.#formHelper(selector)[1];
  }

  async submitForm(selector: string, data?: any) {
    const [ele, map] = this.#formHelper(selector);
    const body = Object.assign(map, data);

    const action = ele.attr("action");
    const method = ele.attr("method").toUpperCase();

    if (method === "POST") return this.#task.postForm(action, body);
    else return this.#task.get(action, body);
  }

  text(selector: string) {
    return this.#root(selector).text();
  }
}

export default abstract class extends TaskBaseHttp {
  static readonly CONFIGS = [...TaskBaseHttp.CONFIGS];

  get page() {
    return new Page(this);
  }
}
