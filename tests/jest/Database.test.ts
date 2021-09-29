import Database from "../../src/Database";
import { NotImplementedError } from "../../src/Errors";

test("create/find/destroy", async () => {
  const d = new Database("SecretKey", "sqlite::memory:");
  await d.init();

  const a = await d.create("x", "type", "a");
  const b = await d.create("x", "type", "b");
  const c = await d.create("y", "type", "c");

  expect(await d.find(null, a.clientId, a.clientSecret)).toBeTruthy();
  expect(await d.find("x", a.clientId, a.clientSecret)).toBeTruthy();
  expect(await d.find("y", a.clientId, a.clientSecret)).toBeFalsy();

  expect(await d.find(null, b.clientId, b.clientSecret)).toBeTruthy();
  expect(await d.find("x", b.clientId, b.clientSecret)).toBeTruthy();
  expect(await d.find("y", b.clientId, b.clientSecret)).toBeFalsy();

  expect(await d.find(null, c.clientId, c.clientSecret)).toBeTruthy();
  expect(await d.find("x", c.clientId, c.clientSecret)).toBeFalsy();
  expect(await d.find("y", c.clientId, c.clientSecret)).toBeTruthy();

  const x = await d.list("x");
  const y = await d.list("y");
  const z = await d.list(null);

  expect(x.length).toBe(2);
  expect(y.length).toBe(1);
  expect(y[0].clientId).toBe(c.clientId);
  expect(z.length).toBe(3);

  expect(await d.destroy("z", a.clientId)).toBeFalsy();
  expect((await d.list(null)).length).toBe(3);
  expect(await d.destroy("x", a.clientId)).toBeTruthy();
  expect((await d.list(null)).length).toBe(2);
  expect((await d.list("x")).length).toBe(1);
  expect(await d.destroy(null, b.clientId)).toBeTruthy();
  expect((await d.list(null)).length).toBe(1);
  expect((await d.list("x")).length).toBe(0);
  await c.destroy();
  expect((await d.list(null)).length).toBe(0);
});

test("credentials", async () => {
  const USER = "test_user";
  const d = new Database("SecretKey", "sqlite::memory:");
  await d.init();
  const k = await d.create(USER, "myType", "Test");
  expect(k.type).toBe("myType");
  expect(k.name).toBe("Test");
  expect(k.clientId).toMatch(/^\w{32,}$/);
  expect(k.clientSecret).toMatch(/^\w{32,}$/);
  const clientId = k.clientId;

  expect(await k.config("iban")).toBeUndefined();
  await k.setConfig("iban", "AT1234");
  expect(await k.config("iban")).toBe("AT1234");

  expect(await d.checkCredentials("invalid", "invalid")).toBeFalsy();
  expect(await d.checkCredentials(clientId, k.clientSecret)).toBeTruthy();

  expect(await d.find(USER, "invalid", k.clientSecret)).toBeFalsy();
  expect(await d.find(USER, k.clientId, "invalid")).toBeFalsy();
  expect(await d.find("other", k.clientId, k.clientSecret)).toBeFalsy();

  expect(await d.find(null, k.clientId, k.clientSecret)).toBeTruthy();
  expect(await d.find(USER, k.clientId, k.clientSecret)).toBeTruthy();

  const c2 = await d.find(USER, k.clientId, k.clientSecret);
  expect(c2.clientId).toMatch(clientId);
  expect(await c2.config("invalid")).toBeUndefined();

  expect(await c2.config("iban")).toBe("AT1234");
  await c2.setConfig("iban", "AT2345");
  expect(await c2.config("iban")).toBe("AT2345");

  const c3 = await d.find(USER, k.clientId, k.clientSecret);
  expect(await c3.config("iban")).toBe("AT2345");

  await d.destroy(USER, clientId);
  expect(await d.find(USER, k.clientId, k.clientSecret)).toBeFalsy();
});

test("edit", async () => {
  const d = new Database("SecretKey", "sqlite::memory:");
  await d.init();

  const a = await d.create("x", "type", "a");

  expect(a.name).toBe("a");
  a.name = "A";
  expect(a.name).toBe("A");

  expect(await a.config("iban")).toBeUndefined();
  await a.setConfigs();
  expect(await a.config("iban")).toBeUndefined();
  await a.setConfigs({ iban: "AT2345", other: "value" });
  expect(await a.config("iban")).toBe("AT2345");
  expect(await a.config("other")).toBe("value");
});

test("timestamps", async () => {
  const d = new Database("SecretKey", "sqlite::memory:");
  await d.init();

  const a = await d.create("x", "type", "a");

  expect(a.createdAt).not.toBeUndefined();
  const ua = a.updatedAt;

  expect(a.lastUsedAt).toBeUndefined();
  expect(a.lastSuccededAt).toBeUndefined();

  await a.updateLastUsedAt();

  expect(a.lastUsedAt).not.toBeUndefined();
  expect(a.lastSuccededAt).toBeUndefined();
  expect(a.updatedAt).toEqual(ua);

  await a.updateLastSuccededAt();

  expect(a.lastUsedAt).not.toBeUndefined();
  expect(a.lastSuccededAt).not.toBeUndefined();
  expect(a.updatedAt).toEqual(ua);
});

test("cipherForUser", async () => {
  const d = new Database("SecretKey", "sqlite::memory:");
  await d.init();

  const a = await d.create("x", "type", "a");

  const cipherA1 = await a.cipherForUser("A");
  const cipherA2 = await a.cipherForUser("A");
  const cipherB = await a.cipherForUser("B");

  const TEST_TEXT = "SomeText";
  const buffer = await cipherA1.encrypt(TEST_TEXT);

  expect(await cipherA2.decrypt(buffer)).toBe(TEST_TEXT);
  expect(await cipherB.decrypt(buffer)).not.toBe(TEST_TEXT);
});

test("regenerateClientSecret", async () => {
  const d = new Database("SecretKey", "sqlite::memory:");
  await d.init();

  const a = await d.create("x", "type", "a");
  expect(() => a.regenerateClientSecret()).toThrowError(NotImplementedError);
});
