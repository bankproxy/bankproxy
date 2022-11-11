import * as fs from "fs";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from "./Errors";
import { addSearchParams, isDevelopment } from "./Utilities";
import { createTask, listTaskConfigs } from "./TaskFactory";
import Database from "./Database";
import Redis from "./Redis";
import TaskParameters from "./TaskParameters";
import TaskUI from "./TaskUI";
import TaskUIWebsocket from "./TaskUIWebsocket";
import UserConfigStoreBrowser from "./UserConfigStoreBrowser";

interface Auth {
  name: string;
  pass: string;
}

function resultPrefix(auth: Auth) {
  return `result-${auth.name}`;
}

export default class {
  #db: Database;
  #redis: Redis;
  #base: string;
  readonly #callbackPath: string;
  readonly #resultPath: string;
  readonly #taskPath: string;

  constructor(
    db: Database,
    redis: Redis,
    base: string,
    callbackPath: string,
    resultPath: string,
    taskPath: string
  ) {
    this.#db = db;
    this.#redis = redis;
    this.#base = base;
    this.#callbackPath = callbackPath;
    this.#resultPath = resultPath;
    this.#taskPath = taskPath;
  }

  get #callbakUri() {
    return this.#base + this.#callbackPath;
  }

  #resultPathFor(resultId: string) {
    return this.#resultPath + "/" + resultId;
  }

  #taskUriFor(taskId: string) {
    return this.#base + this.#taskPath + "/" + taskId;
  }

  async init() {
    await this.#db.init();
  }

  async createTask(auth: Auth | undefined, body: any) {
    if (!auth) throw new UnauthorizedError();
    const ok = await this.#db.checkCredentials(auth.name, auth.pass);
    if (!ok) throw new ForbiddenError();

    const id = await this.#redis.add("task", {
      auth,
      body,
    });
    return this.#taskUriFor(id);
  }

  async headlessTask(auth: Auth | undefined, ui: TaskUI, body: any) {
    if (!auth) throw new UnauthorizedError();
    const db = await this.#db.find(null, auth.name, auth.pass);
    if (!db) throw new ForbiddenError();

    const params = new TaskParameters(db, ui, body, this.#callbakUri);
    return this.#runTask(params);
  }

  async websocketTask(id: string, ui: TaskUIWebsocket) {
    const data = (await this.#redis.getdel("task", id)) as any;
    if (!data) throw new NotFoundError();

    const { auth, body } = data;
    const db = await this.#db.find(null, auth.name, auth.pass);
    if (!db) throw new NotFoundError();

    const ucs =
      body.user &&
      new UserConfigStoreBrowser(
        ui,
        `UCSB:${body.user}`,
        await db.cipherForUser(body.user)
      );

    const params = new TaskParameters(db, ui, body, this.#callbakUri, ucs);
    const result = await this.#runTask(params);

    const resultId = await this.#redis.add(resultPrefix(auth), result);

    ui.redirect(
      addSearchParams(body.callbackUri, {
        result: this.#resultPathFor(resultId),
      })
    );
  }

  async #runTask(params: TaskParameters) {
    const db = params.db;
    await db.updateLastUsedAt();

    const task = createTask(params);
    const result = await task.run();

    await db.updateLastSuccededAt();

    if (isDevelopment) {
      fs.writeFileSync(
        `result-${db.type}-${db.clientId}-${new Date().toISOString()}.json`,
        JSON.stringify(result)
      );
    }

    return result;
  }

  async result(auth: Auth | undefined, id: string) {
    if (!auth) throw new UnauthorizedError();
    const db = await this.#db.find(null, auth.name, auth.pass);
    if (!db) throw new ForbiddenError();

    const ret = (await this.#redis.getdel(resultPrefix(auth), id)) as any;
    if (!ret) throw new NotFoundError();
    return ret;
  }

  async connectors(_user: string) {
    return listTaskConfigs();
  }

  async connections(user: string) {
    const ret = await this.#db.list(user);
    return ret.map((item) => ({
      credentials: {
        clientId: item.clientId,
      },
      type: item.type,
      name: item.name,
    }));
  }

  async createConnection(
    user: string,
    {
      type,
      name,
      config,
    }: { type: string; name?: string; config?: Record<string, unknown> }
  ) {
    if (!type) throw new BadRequestError("type is required");
    const ret = await this.#db.create(user, type, name);
    await ret.setConfigs(config);
    return {
      credentials: {
        clientId: ret.clientId,
        clientSecret: ret.clientSecret,
      },
    };
  }

  async setConnectionConfig(
    user: string,
    {
      credentials,
      config,
    }: {
      credentials: { clientId: string; clientSecret: string };
      config?: Record<string, unknown>;
    }
  ) {
    const clientId = credentials?.clientId;
    if (!clientId)
      throw new BadRequestError("credentials.clientId is required");
    const clientSecret = credentials?.clientSecret;
    if (!clientSecret)
      throw new BadRequestError("credentials.clientSecret is required");
    const ret = await this.#db.find(user, clientId, clientSecret);
    if (!ret) throw new NotFoundError();
    await ret.setConfigs(config);
    return {};
  }

  async detroyConnection(
    user: string,
    {
      credentials,
    }: {
      credentials: { clientId: string };
    }
  ) {
    const clientId = credentials?.clientId;
    if (!clientId)
      throw new BadRequestError("credentials.clientId is required");
    const ret = await this.#db.destroy(user, clientId);
    if (!ret) throw new NotFoundError();
    return {};
  }
}
