import {
  addSearchParams,
  containsOnlyNumbers,
  dateDMYToYMD,
  ifDefined,
  sha256hexdigest,
} from "../../src/Utilities";

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

test("sha256hexdigest", async () => {
  expect(sha256hexdigest("")).toEqual(
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  );
});
