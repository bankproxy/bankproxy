import DatabaseItem from "../../src/DatabaseItem";
import UserConfigStoreDatabase from "../../src/UserConfigStoreDatabase";

test("Pong", async () => {
  const db = {
    async config(name: string) {
      expect(name).toBe("UserConfig");
      return this.value;
    },

    async setConfig(name: string, value: string) {
      expect(name).toBe("UserConfig");
      this.value = value;
    },
  } as DatabaseItem;

  const ucsb = new UserConfigStoreDatabase(db);

  expect(await ucsb.get()).toBeUndefined();

  await ucsb.set("test");
  expect(await ucsb.get()).toBe("test");

  await ucsb.set("other");
  expect(await ucsb.get()).toBe("other");
});
