import * as jwt from "jsonwebtoken";
import { ForbiddenError, UnauthorizedError } from "../../src/Errors";
import JwtChecker from "../../src/JwtChecker";

test("Missing", async () => {
  const fn = JwtChecker("HS256", "secret", "audience");
  (await expect(fn({}))).rejects.toThrowError(UnauthorizedError);
});

test("Empty", async () => {
  const fn = JwtChecker("HS256", "secret", "audience");
  (await expect(fn({ authorization: "" }))).rejects.toThrowError(
    UnauthorizedError
  );
});

test("Malformed", async () => {
  const fn = JwtChecker("HS256", "secret", "audience");
  (
    await expect(fn({ authorization: "Bearer malformed" }))
  ).rejects.toThrowError(ForbiddenError);
});

test("Wrong Secret", async () => {
  const token = jwt.sign({ aud: "audience", sub: "subject" }, "wrong-secret");
  const fn = JwtChecker("HS256", "secret", "audience");
  (await expect(fn({ authorization: `Bearer ${token}` }))).rejects.toThrowError(
    ForbiddenError
  );
});

test("Wrong Audience", async () => {
  const token = jwt.sign({ aud: "wrong-audience", sub: "subject" }, "secret");
  const fn = JwtChecker("HS256", "secret", "audience");
  (await expect(fn({ authorization: `Bearer ${token}` }))).rejects.toThrowError(
    ForbiddenError
  );
});

test("Expired", async () => {
  const token = jwt.sign(
    { aud: "audience", exp: 234567, iat: 123456, sub: "subject" },
    "secret"
  );
  const fn = JwtChecker("HS256", "secret", "audience");
  (await expect(fn({ authorization: `Bearer ${token}` }))).rejects.toThrowError(
    ForbiddenError
  );
});

test("Empty subject", async () => {
  const token = jwt.sign({ aud: "audience", sub: "" }, "secret");
  const fn = JwtChecker("HS256", "secret", "audience");
  (await expect(fn({ authorization: `Bearer ${token}` }))).rejects.toThrowError(
    ForbiddenError
  );
});

test("Valid", async () => {
  const token = jwt.sign({ aud: "audience", sub: "subject" }, "secret");
  const fn = JwtChecker("HS256", "secret", "audience");
  (await expect(fn({ authorization: `Bearer ${token}` }))).resolves.toEqual(
    "subject"
  );
});
