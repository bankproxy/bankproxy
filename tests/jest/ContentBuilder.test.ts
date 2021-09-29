import ContentBuilder from "../../src/ContentBuilder";

test("Empty", async () => {
  const b = new ContentBuilder();
  expect(b.lines).toEqual([]);
});

test("Checkbox", async () => {
  const b = new ContentBuilder();
  b.checkbox("name", "label");
  expect(b.lines).toEqual([{ type: "checkbox", name: "name", label: "label" }]);
});

test("Input", async () => {
  const b = new ContentBuilder();
  b.input("name");
  expect(b.lines).toEqual([{ type: "input", name: "name" }]);
});

test("Text", async () => {
  const b = new ContentBuilder();
  b.text("name");
  expect(b.lines).toEqual([{ type: "text", text: "name" }]);
});

test("Submit", async () => {
  const b = new ContentBuilder();
  b.submit("text");
  expect(b.lines).toEqual([{ type: "submit", text: "text" }]);
});

test("Password", async () => {
  const b = new ContentBuilder();
  b.password("name");
  expect(b.lines).toEqual([{ type: "password", name: "name" }]);
});

test("Link", async () => {
  const b = new ContentBuilder();
  b.link("url", "text");
  expect(b.lines).toEqual([{ type: "link", url: "url", text: "text" }]);
});

test("Spinner", async () => {
  const b = new ContentBuilder();
  b.spinner();
  expect(b.lines).toEqual([{ type: "spinner" }]);
});

test("Spinner", async () => {
  const b = new ContentBuilder();
  b.spinner();
  b.text("Waiting");
  b.link("/", "To Root");
  expect(b.lines).toEqual([
    { type: "spinner" },
    { type: "text", text: "Waiting" },
    { type: "link", url: "/", text: "To Root" },
  ]);
});
