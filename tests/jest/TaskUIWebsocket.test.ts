import * as WebSocket from "ws";
import TaskUIWebsocket from "../../src/TaskUIWebsocket";

jest.mock("ws");
jest.useFakeTimers();

function createWebsocket(req?: any) {
  const ws = new WebSocket("ws://127.0.0.1");
  const wsMock = ws as any;

  const eventHandlers = new Map<string, (...args) => void>();
  wsMock.on = (name: string, fn: (...args) => void) => {
    eventHandlers.set(name, fn);
  };
  wsMock.emit = (name: string, ...args) => {
    eventHandlers.get(name)(...args);
  };

  const ui = new TaskUIWebsocket(req || {}, ws);
  return { ui, ws };
}

test("ClientConnected", async () => {
  const { ui, ws } = createWebsocket({});
  const spy = jest.spyOn(ws, "terminate");

  expect(ui.clientConnected).toBeTruthy();
  jest.runOnlyPendingTimers();
  ws.emit("pong");

  expect(ui.clientConnected).toBeTruthy();
  jest.runOnlyPendingTimers();
  ws.emit("pong");

  expect(ui.clientConnected).toBeTruthy();
  jest.runOnlyPendingTimers();
  expect(spy).not.toHaveBeenCalled();

  expect(ui.clientConnected).toBeTruthy();
  jest.runOnlyPendingTimers();
  expect(spy).toHaveBeenCalled();
  ws.emit("close");
  expect(ui.clientConnected).toBeFalsy();
});

function testSend(fn: (ui: TaskUIWebsocket) => void, expected: any) {
  const { ui, ws } = createWebsocket();
  const spy = jest.spyOn(ws, "send");

  fn(ui);

  const obj = JSON.parse(spy.mock.calls[0][0]);
  expect(obj).toEqual(expected);

  ws.emit("close");
}

test("Spinner w/o text", async () => {
  testSend(
    (ui) => {
      ui.spinner();
    },
    { content: [{ type: "spinner" }] }
  );
});

test("Spinner with text", async () => {
  testSend(
    (ui) => {
      ui.spinner("Example");
    },
    {
      content: [{ type: "spinner" }, { type: "text", text: "Example" }],
    }
  );
});

test("Redirect", async () => {
  testSend(
    (ui) => {
      ui.redirect("url");
    },
    {
      redirect: "url",
    }
  );
});

test("Set", async () => {
  testSend(
    (ui) => {
      ui.set("key", "value");
    },
    {
      set: { key: "key", value: "value" },
    }
  );
});

test("Get valid message", async () => {
  const { ui, ws } = createWebsocket();
  const spy = jest.spyOn(ws, "send");

  const promise = ui.get("key");

  const obj = JSON.parse(spy.mock.calls[0][0]);
  expect(obj).toEqual({ get: { key: "key" } });

  ws.emit("message", JSON.stringify({ get: { key: "value" } }));

  expect(promise).resolves.toEqual("value");

  ws.emit("close");
});

test("Get other message", async () => {
  const { ui, ws } = createWebsocket();
  const spy = jest.spyOn(ws, "send");

  const promise = ui.get("key");

  const obj = JSON.parse(spy.mock.calls[0][0]);
  expect(obj).toEqual({ get: { key: "key" } });

  ws.emit("message", JSON.stringify({ other: "test" }));
  ws.emit("message", JSON.stringify({ other: "test2" }));
  ws.emit("message", JSON.stringify({ get: { key: "value" } }));

  expect(promise).resolves.toEqual("value");

  ws.emit("close");
});

test("Get closed", async () => {
  const { ui, ws } = createWebsocket();
  const spy = jest.spyOn(ws, "send");

  const promise = ui.get("key");

  const obj = JSON.parse(spy.mock.calls[0][0]);
  expect(obj).toEqual({ get: { key: "key" } });

  ws.emit("close");

  await expect(promise).rejects.toThrow();
});

test("Get already closed", async () => {
  const { ui, ws } = createWebsocket();
  const spy = jest.spyOn(ws, "send");

  ws.emit("close");

  const promise = ui.get("key");

  expect(spy).not.toHaveBeenCalled();
  await expect(promise).rejects.toThrow();
});

test("Callback valid message", async () => {
  const { ui, ws } = createWebsocket();
  const spy = jest.spyOn(ws, "send");

  const promise = ui.callback("url", "text");

  const obj = JSON.parse(spy.mock.calls[0][0]);
  expect(obj).toEqual({
    content: [{ type: "link", text: "text", url: "url" }],
  });

  ws.emit("message", JSON.stringify({ callback: "schema:host" }));

  expect(promise).resolves.toEqual(new URL("schema:host"));

  ws.emit("close");
});

test("Callback invalid url", async () => {
  const { ui, ws } = createWebsocket();
  const spy = jest.spyOn(ws, "send");

  const promise = ui.callback("url", "text");

  const obj = JSON.parse(spy.mock.calls[0][0]);
  expect(obj).toEqual({
    content: [{ type: "link", text: "text", url: "url" }],
  });

  ws.emit("message", JSON.stringify({ callback: "invalid" }));

  await expect(promise).rejects.toThrowError();

  ws.emit("close");
});

test("Callback other message", async () => {
  const { ui, ws } = createWebsocket();
  const spy = jest.spyOn(ws, "send");

  const promise = ui.callback("url", "text");

  const obj = JSON.parse(spy.mock.calls[0][0]);
  expect(obj).toEqual({
    content: [{ type: "link", text: "text", url: "url" }],
  });

  ws.emit("message", JSON.stringify({ other: "test" }));
  ws.emit("message", JSON.stringify({ other: "test2" }));
  ws.emit("message", JSON.stringify({ callback: "schema:host" }));

  expect(promise).resolves.toEqual(new URL("schema:host"));

  ws.emit("close");
});

test("Callback closed", async () => {
  const { ui, ws } = createWebsocket();
  const spy = jest.spyOn(ws, "send");

  const promise = ui.callback("url", "text");

  const obj = JSON.parse(spy.mock.calls[0][0]);
  expect(obj).toEqual({
    content: [{ type: "link", text: "text", url: "url" }],
  });

  ws.emit("close");

  await expect(promise).rejects.toThrow();
});

test("Callback already closed", async () => {
  const { ui, ws } = createWebsocket();
  const spy = jest.spyOn(ws, "send");

  ws.emit("close");

  const promise = ui.callback("url", "text");

  expect(spy).not.toHaveBeenCalled();
  await expect(promise).rejects.toThrow();
});

test("Wait ok", async () => {
  const { ui, ws } = createWebsocket();
  const spy = jest.spyOn(ws, "send");

  const promise = ui.wait(1000);

  jest.advanceTimersByTime(1500);

  expect(spy).not.toHaveBeenCalled();
  await expect(promise).resolves.toBeNull();
});

test("Wait closed", async () => {
  const { ui, ws } = createWebsocket();
  const spy = jest.spyOn(ws, "send");

  const promise = ui.wait(1000);

  ws.emit("close");

  expect(spy).not.toHaveBeenCalled();
  await expect(promise).rejects.toThrow();
});

test("Wait already closed", async () => {
  const { ui, ws } = createWebsocket();
  const spy = jest.spyOn(ws, "send");

  ws.emit("close");

  const promise = ui.wait(1000);

  expect(spy).not.toHaveBeenCalled();
  await expect(promise).rejects.toThrow();
});

test("Prompt valid message", async () => {
  const { ui, ws } = createWebsocket();
  const spy = jest.spyOn(ws, "send");

  const promise = ui.prompt("title", "submit", ($) => {
    $.input("name");
  });

  const obj = JSON.parse(spy.mock.calls[0][0]);
  expect(obj).toEqual({
    content: [
      { type: "text", text: "title" },
      { type: "input", name: "name" },
      { type: "submit", text: "submit" },
    ],
  });

  ws.emit("message", JSON.stringify({ form: { data: { name: "value" } } }));

  await expect(promise).resolves.toEqual({ name: "value" });

  ws.emit("close");
});

test("Prompt options", async () => {
  const { ui, ws } = createWebsocket();
  const spy = jest.spyOn(ws, "send");

  const promise = ui.promptOption("title", [
    { text: "AA", value: "11" },
    { text: "BB", value: "22" },
  ]);

  const obj = JSON.parse(spy.mock.calls[0][0]);
  expect(obj).toEqual({
    content: [
      { type: "text", text: "title" },
      { type: "submit", text: "AA", value: "11" },
      { type: "submit", text: "BB", value: "22" },
    ],
  });

  ws.emit("message", JSON.stringify({ form: { submitter: "22" } }));

  await expect(promise).resolves.toBe("22");

  ws.emit("close");
});

test("Prompt already closed", async () => {
  const { ui, ws } = createWebsocket();
  const spy = jest.spyOn(ws, "send");

  ws.emit("close");

  const promise = ui.prompt("title", "submit", () => {});

  expect(spy).not.toHaveBeenCalled();
  await expect(promise).rejects.toThrow();
});
