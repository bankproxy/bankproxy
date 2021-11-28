import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "../../src/Errors";
import Database from "../../src/Database";
import Main from "../../src/Main";
import Redis from "../../src/Redis";
import TaskUIHeadless from "../../src/TaskUIHeadless";
import Test from "../../src/tasks/Test";

async function createMain() {
  const db = new Database("SecretKey", "sqlite::memory:");
  const redis = new Redis("SecretKey");
  await redis.connect();
  const ret = new Main(db, redis, "BASE", "/c", "/r", "/t");
  await ret.init();
  return ret;
}

function invalidAuth() {
  return {
    name: "name",
    pass: "pass",
  };
}

function validAuth(credentials: { clientId: string; clientSecret: string }) {
  return {
    name: credentials.clientId,
    pass: credentials.clientSecret,
  };
}

test("list connectors", async () => {
  const m = await createMain();
  await expect(m.connectors("")).resolves.not.toEqual([]);
});

test("list connection", async () => {
  const m = await createMain();

  await expect(m.connections("user")).resolves.toEqual([]);
  await expect(m.connections("unknown")).resolves.toEqual([]);

  const { credentials } = await m.createConnection("user", {
    type: Test.ID,
    name: "C123",
  });

  await expect(m.connections("user")).resolves.toEqual([
    {
      credentials: { clientId: credentials.clientId },
      type: Test.ID,
      name: "C123",
    },
  ]);
  await expect(m.connections("unknown")).resolves.toEqual([]);
});

test("creating connection", async () => {
  const m = await createMain();
  const c = await m.createConnection("user", {
    type: Test.ID,
  });
  expect(c.credentials.clientId).toMatch(/^\w{32}$/);
  expect(c.credentials.clientSecret).toMatch(/^\w{32}$/);

  await expect(
    m.createConnection("user", {
      type: "",
    })
  ).rejects.toThrowError(BadRequestError);
});

test("update connection", async () => {
  const m = await createMain();
  const { credentials } = await m.createConnection("user", {
    type: Test.ID,
    config: { IBAN: "AT1234" },
  });

  await expect(
    m.setConnectionConfig("user", {
      credentials: { clientId: "", clientSecret: credentials.clientSecret },
      config: { IBAN: "AT2345" },
    })
  ).rejects.toThrowError(BadRequestError);

  await expect(
    m.setConnectionConfig("user", {
      credentials: { clientId: credentials.clientId, clientSecret: "" },
      config: { IBAN: "AT2345" },
    })
  ).rejects.toThrowError(BadRequestError);

  await expect(
    m.setConnectionConfig("unknown", {
      credentials,
      config: { IBAN: "AT2345" },
    })
  ).rejects.toThrowError(NotFoundError);

  await m.setConnectionConfig("user", {
    credentials,
    config: { IBAN: "AT2345" },
  });
});

test("destroy connection", async () => {
  const m = await createMain();
  const { credentials } = await m.createConnection("user", {
    type: Test.ID,
  });

  await expect(
    m.detroyConnection("unknown", {
      credentials: {
        clientId: "",
      },
    })
  ).rejects.toThrowError(BadRequestError);

  await expect(
    m.detroyConnection("unknown", {
      credentials: {
        clientId: credentials.clientId,
      },
    })
  ).rejects.toThrowError(NotFoundError);

  await m.detroyConnection("user", {
    credentials: {
      clientId: credentials.clientId,
    },
  });
});

test("create task", async () => {
  const m = await createMain();
  const { credentials } = await m.createConnection("user", {
    type: Test.ID,
  });

  await expect(m.createTask(null, {})).rejects.toThrowError(UnauthorizedError);

  await expect(m.createTask(invalidAuth(), {})).rejects.toThrowError(
    ForbiddenError
  );

  await expect(m.createTask(validAuth(credentials), {})).resolves.toMatch(
    /^BASE\/t\/\w{64}$/
  );
});

test("headless task", async () => {
  const m = await createMain();
  const { credentials } = await m.createConnection("user", {
    type: Test.ID,
    config: { IBAN: "AT1234", Headless: true },
  });

  await expect(
    m.headlessTask(null, new TaskUIHeadless({}), {
      accounts: [{ iban: "AT1234" }],
    })
  ).rejects.toThrowError(UnauthorizedError);

  await expect(
    m.headlessTask(invalidAuth(), new TaskUIHeadless({}), {
      accounts: [{ iban: "AT1234" }],
    })
  ).rejects.toThrowError(ForbiddenError);

  const ret = await m.headlessTask(
    validAuth(credentials),
    new TaskUIHeadless({}),
    { accounts: [{ iban: "AT1234" }] }
  );

  expect(ret.result.length).toBe(1);
});

test("unknown websocket task", async () => {
  const m = await createMain();
  const { credentials } = await m.createConnection("user", {
    type: Test.ID,
  });
  await m.createTask(validAuth(credentials), {});

  await expect(m.websocketTask("unknown", null)).rejects.toThrowError(
    NotFoundError
  );
});

test("result", async () => {
  const m = await createMain();
  const { credentials } = await m.createConnection("user", {
    type: Test.ID,
    config: { IBAN: "AT1234" },
  });

  await expect(m.result(null, "someid")).rejects.toThrowError(
    UnauthorizedError
  );

  await expect(m.result(invalidAuth(), "someid")).rejects.toThrowError(
    ForbiddenError
  );

  await expect(m.result(validAuth(credentials), "someid")).rejects.toThrowError(
    NotFoundError
  );
});
