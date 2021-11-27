import { Page } from "../../src/Page";

test("single element", async () => {
  const page = new Page(`<html><body><h1 id="test">Header</h1></body></html>`);
  expect(page.text("#test")).toBe("Header");
  expect(page.text("h1")).toBe("Header");
  expect(page.text("body > h1")).toBe("Header");
});

test("multiple elements", async () => {
  const page = new Page(`<ul><li>First</li><li>Second</li><li>Third</li></ul>`);
  expect(page.text("li")).toBe("FirstSecondThird");
  expect(page.text("li:nth-of-type(2)")).toBe("Second");
  expect(page.text("li:last-of-type")).toBe("Third");

  const text = [...page.querySelectorAll("li")].map((el) => el.text());
  expect(text).toEqual(["First", "Second", "Third"]);
});

test("html", async () => {
  const page = new Page(`<div>First<br>Second   <br/>\nThird</div>`);

  const html = page.map("div", (el) => el.html());
  expect(html).toEqual(["First<br>Second   <br>\nThird"]);
});

test("attr", async () => {
  const page = new Page(
    `<div><span class="test" data-test="1234">Text</span></div>`
  );
  expect(page.attr("data-test", ".test")).toBe("1234");

  const attr = page.map("div", (el) => el.attr("data-test", ".test"));
  expect(attr).toEqual(["1234"]);
});

test("form", async () => {
  const page = new Page(
    `<form action="/path" method="get">
      <input name="a" value="1">
      <input name="b" value="2">
    </form>`
  );

  expect(page.form("#unknown")).toBeNull();

  expect(page.form("form")).toEqual({
    action: "/path",
    method: "GET",
    elements: { a: "1", b: "2" },
  });
  expect(page.formElements("form")).toEqual({ a: "1", b: "2" });
});
