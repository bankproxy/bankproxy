import {
  addSearchParams,
  containsOnlyNumbers,
  dateDMYToYMD,
  ifDefined,
  publicRsaEncryptUpperHex,
  sha256hexdigest,
} from "../../src/Utilities";
import { generateKeyPair, privateDecrypt } from "crypto";
import { promisify } from "util";

test("containsOnlyNumbers", async () => {
  expect(containsOnlyNumbers("0123456789")).toBeTruthy();
  expect(containsOnlyNumbers("12")).toBeTruthy();
  expect(containsOnlyNumbers("aa")).toBeFalsy();
  expect(containsOnlyNumbers("1.2")).toBeFalsy();
  expect(containsOnlyNumbers("*")).toBeFalsy();
  expect(containsOnlyNumbers(null)).toBeFalsy();
});

test("dateDMYToYMD", async () => {
  expect(dateDMYToYMD("01.02.1234")).toEqual("1234-02-01");
  expect(dateDMYToYMD("24.12.1999")).toEqual("1999-12-24");
});

test("ifDefined", async () => {
  expect(ifDefined(null)).toBeUndefined();
  expect(ifDefined("test")).toEqual("test");
});

test("addSearchParams", async () => {
  expect(addSearchParams("test")).toEqual("test");
  expect(addSearchParams("test", {})).toEqual("test?");
  expect(addSearchParams("test", { b: "b" })).toEqual("test?b=b");
  expect(addSearchParams("test", { b: "b", c: "c" })).toEqual("test?b=b&c=c");
  expect(addSearchParams("test?a=a", { b: "b" })).toEqual("test?a=a&b=b");
  expect(addSearchParams("test?a=a", { b: "b", c: "c" })).toEqual(
    "test?a=a&b=b&c=c"
  );
});

test("publicRsaEncryptUpperHex", async () => {
  const keyPair = await promisify(generateKeyPair)("rsa", {
    modulusLength: 1024,
  });
  const jwtKey = keyPair.publicKey.export({ format: "jwk" });
  const modulus = Buffer.from(jwtKey.n, "base64").toString("hex");
  const publicExponent = Buffer.from(jwtKey.e, "base64").toString("hex");
  const buffer = Buffer.from("Test");
  const encoded = publicRsaEncryptUpperHex({ modulus, publicExponent }, buffer);
  const decoded = privateDecrypt(
    keyPair.privateKey,
    Buffer.from(encoded, "hex")
  );
  expect(decoded).toEqual(buffer);
});

test("sha256hexdigest", async () => {
  expect(sha256hexdigest("")).toEqual(
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  );
});
