export default class {
  public readonly lines = [];

  #add(type: string, line: any = {}) {
    line.type = type;
    this.lines.push(line);
  }

  spinner() {
    this.#add("spinner");
  }

  text(text: string) {
    this.#add("text", { text });
  }

  submit(text?: string, value?: string) {
    this.#add("submit", { text, value });
  }

  checkbox(name: string, label?: string) {
    this.#add("checkbox", { name, label });
  }

  input(name: string, label?: string) {
    this.#add("input", { name, label });
  }

  password(name: string, label?: string) {
    this.#add("password", { name, label });
  }

  link(url: string, text: string) {
    this.#add("link", { url, text });
  }
}
