import Cipher, { CIPHER_KEY_LEN } from "../../src/Cipher";

const TEST_TEXT = "MyText";

test("generateKey", async () => {
  const key = await Cipher.generateRandomKey();
  expect(key.length).toBe(CIPHER_KEY_LEN);
});

test("dencrypt", async () => {
  const cipher = new Cipher(await Cipher.generateRandomKey());

  const buffer = await cipher.encrypt(TEST_TEXT);
  expect(buffer).not.toBe(Buffer.from(TEST_TEXT));
  expect(buffer.length).toBe(CIPHER_KEY_LEN);
  expect(await cipher.decrypt(buffer)).toBe(TEST_TEXT);
});

test("empty arguments", async () => {
  const cipher = new Cipher(await Cipher.generateRandomKey());

  expect(await cipher.decrypt(null)).toBeUndefined();
  expect(await cipher.decryptBase64(null)).toBeUndefined();
  expect(await cipher.encrypt(null)).toBeUndefined();
  expect(await cipher.encryptBase64(null)).toBeUndefined();
});

test("deriveCipher", async () => {
  const cipher = new Cipher(await Cipher.generateRandomKey());
  const cipherA1 = await cipher.deriveCipher("A");
  const cipherA2 = await cipher.deriveCipher("A");
  const cipherB = await cipher.deriveCipher("B");

  const buffer = await cipher.encrypt(TEST_TEXT);
  const bufferA1 = await cipherA1.encrypt(TEST_TEXT);
  const bufferA2 = await cipherA2.encrypt(TEST_TEXT);
  const bufferB = await cipherB.encrypt(TEST_TEXT);

  expect(await cipher.decrypt(buffer)).toBe(TEST_TEXT);
  expect(await cipher.decrypt(bufferA1)).not.toBe(TEST_TEXT);
  expect(await cipher.decrypt(bufferA2)).not.toBe(TEST_TEXT);
  expect(await cipher.decrypt(bufferB)).not.toBe(TEST_TEXT);

  expect(await cipherA1.decrypt(buffer)).not.toBe(TEST_TEXT);
  expect(await cipherA1.decrypt(bufferA1)).toBe(TEST_TEXT);
  expect(await cipherA1.decrypt(bufferA2)).toBe(TEST_TEXT);
  expect(await cipherA1.decrypt(bufferB)).not.toBe(TEST_TEXT);

  expect(await cipherA2.decrypt(buffer)).not.toBe(TEST_TEXT);
  expect(await cipherA2.decrypt(bufferA1)).toBe(TEST_TEXT);
  expect(await cipherA2.decrypt(bufferA2)).toBe(TEST_TEXT);
  expect(await cipherA2.decrypt(bufferB)).not.toBe(TEST_TEXT);

  expect(await cipherB.decrypt(buffer)).not.toBe(TEST_TEXT);
  expect(await cipherB.decrypt(bufferA1)).not.toBe(TEST_TEXT);
  expect(await cipherB.decrypt(bufferA2)).not.toBe(TEST_TEXT);
  expect(await cipherB.decrypt(bufferB)).toBe(TEST_TEXT);
});
