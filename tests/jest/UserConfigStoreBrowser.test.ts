import Cipher from "../../src/Cipher";
import TaskUIWebsocket from "../../src/TaskUIWebsocket";
import UserConfigStoreBrowser from "../../src/UserConfigStoreBrowser";

test("Pong", async () => {
  const ui = {
    get(key: string) {
      expect(key).toBe("key");
      return this.value;
    },

    set(key: string, value: string) {
      expect(key).toBe("key");
      expect(value).not.toBe("test");
      expect(value).not.toBe("other");
      this.value = value;
    },
  } as TaskUIWebsocket;

  const cipher = new Cipher(await Cipher.generateRandomKey());
  const ucsb = new UserConfigStoreBrowser(ui, "key", cipher);

  expect(await ucsb.get()).toBeUndefined();

  await ucsb.set("test");
  expect(await ucsb.get()).toBe("test");

  await ucsb.set("other");
  expect(await ucsb.get()).toBe("other");
});
