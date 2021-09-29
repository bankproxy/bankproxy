import * as nock from "nock";
import TaskBaseHttp from "../../src/TaskBaseHttp";

const BASE_URL = "https://example.com";

class TestTask extends TaskBaseHttp {
  constructor() {
    super(null);
  }

  get baseUrl() {
    return BASE_URL;
  }

  get log() {
    return () => {};
  }

  async run() {
    return { result: [] };
  }
}

test("DELETE", async () => {
  nock(BASE_URL).delete("/path").reply(200, "OK");

  const t = new TestTask();
  await t.delete("/path");
  expect(t.text).toEqual("OK");
});

test("GET 200", async () => {
  nock(BASE_URL).get("/path").reply(200, '{"a":1}');

  const t = new TestTask();
  await t.get("/path");
  expect(t.json).toMatchObject({ a: 1 });
});

test("GET 200 with query", async () => {
  nock(BASE_URL).get("/path").query({ test: 1234 }).reply(200, '{"a":1}');

  const t = new TestTask();
  await t.get("/path", { test: 1234 });
  expect(t.json).toMatchObject({ a: 1 });
});

test("GET 200 with added query", async () => {
  nock(BASE_URL)
    .get("/path")
    .query({ id: 99, test: 1234 })
    .reply(200, '{"a":1}');

  const t = new TestTask();
  await t.get("/path?id=99", { test: 1234 });
  expect(t.json).toMatchObject({ a: 1 });
});

test("GET 404", async () => {
  nock(BASE_URL).get("/path").reply(404, "missing");

  const t = new TestTask();
  await t.get("/path");
  expect(t.text).toEqual("missing");
});

test("POST form", async () => {
  nock(BASE_URL).post("/path").reply(200, "OK");

  const t = new TestTask();
  await t.postForm("/path");
  expect(t.text).toEqual("OK");
});

test("POST form with data", async () => {
  nock(BASE_URL)
    .post("/path", { test: 1234 })
    .reply(200, function () {
      return this.req.headers["content-type"];
    });

  const t = new TestTask();
  await t.postForm("/path", { test: 1234 });
  expect(t.text).toEqual("application/x-www-form-urlencoded");
});

test("POST json", async () => {
  nock(BASE_URL)
    .post("/path")
    .reply(200, function () {
      return this.req.headers["content-type"];
    });

  const t = new TestTask();
  await t.postJSON("/path");
  expect(t.text).toEqual("application/json");
});

test("POST JSON with data", async () => {
  nock(BASE_URL)
    .post("/path", { test: 1234 })
    .reply(200, function () {
      return this.req.headers["content-type"];
    });

  const t = new TestTask();
  await t.postJSON("/path", { test: 1234 });
  expect(t.text).toEqual("application/json");
});

test("PUT json", async () => {
  nock(BASE_URL)
    .put("/path")
    .reply(200, function () {
      return this.req.headers["content-type"];
    });

  const t = new TestTask();
  await t.putJSON("/path");
  expect(t.text).toEqual("application/json");
});

test("PUT JSON with data", async () => {
  nock(BASE_URL)
    .put("/path", { test: 1234 })
    .reply(200, function () {
      return this.req.headers["content-type"];
    });

  const t = new TestTask();
  await t.putJSON("/path", { test: 1234 });
  expect(t.text).toEqual("application/json");
});

test("absolute url", async () => {
  nock("https://example.net").get("/path").twice().reply(200, "OK");

  const t = new TestTask();
  await t.get("https://example.net/path");
  expect(t.text).toEqual("OK");
});

test("setOrigin", async () => {
  const ORIGIN = "https://example.net";

  nock(BASE_URL)
    .get("/path")
    .twice()
    .reply(200, function () {
      return this.req.headers["origin"] || "";
    });

  const t = new TestTask();
  await t.get("/path");
  expect(t.text).toEqual("");

  t.setOrigin(ORIGIN);
  await t.get("/path");
  expect(t.text).toEqual(ORIGIN);
});

test("withBearerAuthorization", async () => {
  nock(BASE_URL)
    .get("/path")
    .times(4)
    .reply(200, function () {
      return this.req.headers["authorization"] || "";
    });

  const t = new TestTask();
  await t.get("/path");
  expect(t.text).toEqual("");

  t.setBearerAuthorization("a");
  await t.get("/path");
  expect(t.text).toEqual("Bearer a");

  await t.withBearerAuthorization("b", () => t.get("/path"));
  expect(t.text).toEqual("Bearer b");

  await t.get("/path");
  expect(t.text).toEqual("Bearer a");
});

test("setAccessTokenFromLocationHeader", async () => {
  nock(BASE_URL)
    .get("/path")
    .twice()
    .reply(
      200,
      function () {
        return this.req.headers["authorization"] || "";
      },
      {
        Location:
          "https://example.net/path?access_token=xx#test=123&access_token=ab",
      }
    );

  const t = new TestTask();
  await t.get("/path");
  expect(t.text).toEqual("");

  t.setAccessTokenFromLocationHeader();
  await t.get("/path");
  expect(t.text).toEqual("Bearer ab");
});

test("cookies", async () => {
  nock(BASE_URL)
    .get("/path")
    .reply(
      200,
      function () {
        return this.req.headers["cookie"];
      },
      { "Set-Cookie": "a=1" }
    )
    .get("/path")
    .reply(
      200,
      function () {
        return this.req.headers["cookie"];
      },
      {
        "Set-Cookie": ["b=2", "c=3"],
      }
    )
    .get("/path")
    .reply(200, function () {
      return this.req.headers["cookie"];
    });

  const t = new TestTask();
  await t.get("/path");
  expect(t.text).not.toContain("a=1");
  expect(t.text).not.toContain("b=2");
  expect(t.text).not.toContain("c=3");

  await t.get("/path");
  expect(t.text).toContain("a=1");
  expect(t.text).not.toContain("b=2");
  expect(t.text).not.toContain("c=3");

  await t.get("/path");
  expect(t.text).toContain("a=1");
  expect(t.text).toContain("b=2");
  expect(t.text).toContain("c=3");
});
