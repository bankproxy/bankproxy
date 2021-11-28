import TaskUIHeadless from "../../src/TaskUIHeadless";

test("test", async () => {
  const ui = new TaskUIHeadless({
    socket: { remoteAddress: "1.2.3.4", remotePort: 4321 },
    headers: { "user-agent": "Mozilla" },
  });

  expect(ui.clientConnected).toBeTruthy();
  expect(ui.ipAddress).toEqual("1.2.3.4");
  expect(ui.ipPort).toEqual(4321);
  expect(ui.userAgent).toEqual("Mozilla");

  expect(() => ui.spinner("text")).not.toThrow();

  expect(() => ui.prompt("title", "submit", () => 0)).toThrow();
  expect(() => ui.promptOption("title", [])).toThrow();
  expect(() => ui.callback("url", "text")).toThrow();
  expect(() => ui.wait(1000)).not.toThrow();
});
