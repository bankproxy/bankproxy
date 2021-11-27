import { Page } from "./Page";
import TaskBaseHttp from "./TaskBaseHttp";

export default abstract class extends TaskBaseHttp {
  static readonly CONFIGS = [...TaskBaseHttp.CONFIGS];

  get page() {
    return new Page(this.text);
  }

  async submitForm(selector: string, data?: any) {
    const { action, method, elements } = this.page.form(selector);
    const body = Object.assign(elements, data);

    if (method === "POST") return this.postForm(action, body);
    return this.get(action, body);
  }
}
