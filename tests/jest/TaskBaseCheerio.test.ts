import TaskBaseCheerio from "../../src/TaskBaseCheerio";
import TaskParameters from "../../src/TaskParameters";
import Test from "../../src/tasks/Test";

class Task extends TaskBaseCheerio {
  #text: string;

  constructor(text: string) {
    super({
      db: { type: Test.ID },
    } as TaskParameters);

    this.#text = text;
  }

  get text() {
    return this.#text;
  }

  static async #testHelper(
    method: keyof Task,
    text: string,
    data?: any
  ): Promise<[string, any]> {
    const task = new Task(text);

    const spy = jest.spyOn(task, method as any).mockImplementation(() => "ret");

    expect(await task.submitForm("form", data)).toBe("ret");

    return spy.mock.calls[0] as [string, any];
  }

  static testPost(text: string, data?: any) {
    return this.#testHelper("postForm", text, data);
  }

  static testGet(text: string, data?: any) {
    return this.#testHelper("get", text, data);
  }
}

test("page", async () => {
  const task = new Task("<a>test</a>");
  expect(task.page.text("a")).toEqual("test");
});

test("post", async () => {
  const [uri, body] = await Task.testPost(
    `<form action=/a method=POST></form>`
  );

  expect(uri).toEqual("/a");
  expect(body).toEqual({});
});

test("get", async () => {
  const [uri, body] = await Task.testGet(`<form action=/b></form>`);

  expect(uri).toEqual("/b");
  expect(body).toEqual({});
});

test("inputs", async () => {
  const [uri, body] = await Task.testGet(
    `<form action=/c>
      <input name=x value=1>
      <input name=y value=2>
    </form>`
  );

  expect(uri).toEqual("/c");
  expect(body).toEqual({ x: "1", y: "2" });
});

test("inputs override", async () => {
  const [uri, body] = await Task.testGet(
    `<form action=/d>
      <input name=x value=1>
      <input name=y value=2>
    </form>`,
    { y: "8", z: "9" }
  );

  expect(uri).toEqual("/d");
  expect(body).toEqual({ x: "1", y: "8", z: "9" });
});
