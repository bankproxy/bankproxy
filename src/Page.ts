import * as cheerio from "cheerio";

export class PageNode {
  #node: cheerio.Cheerio<cheerio.Node>;

  constructor(node: cheerio.Cheerio<cheerio.Node>) {
    this.#node = node;
  }

  #find(selector: string) {
    if (!selector) return this.#node;
    return this.#node.find(selector);
  }

  attr(name: string, selector?: string) {
    return this.#find(selector).attr(name);
  }

  html(selector?: string) {
    return this.#find(selector).html();
  }

  text(selector?: string) {
    return this.#find(selector).text();
  }
}

export class Page {
  protected api: cheerio.CheerioAPI;

  constructor(content: string) {
    this.api = cheerio.load(content);
  }

  *querySelectorAll(selector: string) {
    for (const el of this.api(selector)) yield new PageNode(this.api(el));
  }

  map<T>(selector: string, callback: (node: PageNode, i: number) => T): T[] {
    return this.api(selector)
      .map((i, el) => callback(new PageNode(this.api(el)), i))
      .toArray();
  }

  attr(name: string, selector: string) {
    return this.api(selector).attr(name);
  }

  text(selector: string) {
    return this.api(selector).text();
  }

  form(selector: string) {
    const ele = this.api(selector);
    if (!ele.length) return null;

    const elements: any = {};
    for (const { name, value } of ele.serializeArray()) elements[name] = value;

    return {
      action: ele.attr("action"),
      method: ele.attr("method")?.toUpperCase(),
      elements,
    };
  }

  formElements(selector: string) {
    return this.form(selector)?.elements;
  }
}
