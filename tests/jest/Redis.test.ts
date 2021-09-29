import Redis from "../../src/Redis";

test("Add an Delete", async () => {
  const r = new Redis("SecretKey");
  const k = await r.add("X", { a: "A", b: "B" });
  expect(k).toMatch(/^[0-9a-f]+$/);
  const v = await r.getdel("X", k);
  expect(v).toMatchObject({ a: "A", b: "B" });
  expect(await r.getdel("Y", k)).toBeFalsy();
});

test("Getting unknown key return null", async () => {
  const r = new Redis("SecretKey");
  const v = await r.getdel("X", "0123456789");
  expect(v).toBeFalsy();
});

test("Getting invalid key returns null", async () => {
  const r = new Redis("SecretKey");
  const v = await r.getdel("X", "abcdefghij");
  expect(v).toBeFalsy();
});
