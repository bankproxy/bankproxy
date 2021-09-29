import * as http from "http";
import { Algorithm, sign as jwtSign } from "jsonwebtoken";
import Configuration from "./src/Configuration";
import Database from "./src/Database";
import Main from "./src/Main";
import Redis from "./src/Redis";
import TaskUIHeadless from "./src/TaskUIHeadless";
import TaskUIWebsocket from "./src/TaskUIWebsocket";
import { isDevelopment } from "./src/Utilities";
import { join } from "path";
import server from "./src/Server";
import verifyJwtHeader from "./src/JwtChecker";

const ADMIN_PATH = "/admin";
const CALLBACK_PATH = "/callback";
const RESULT_PATH = "/result";
const TASK_PATH = "/task";

const db = new Database(Configuration.SECRET_KEY, Configuration.DATABASE_URL);
const redis = new Redis(Configuration.SECRET_KEY, Configuration.REDIS_URL);
const main = new Main(
  db,
  redis,
  Configuration.BASE_URL,
  CALLBACK_PATH,
  RESULT_PATH,
  TASK_PATH
);

const userFromIdToken = verifyJwtHeader(
  Configuration.ADMIN_JWT_ALGORITHM as Algorithm,
  Configuration.ADMIN_JWT_SECRET,
  Configuration.ADMIN_JWT_AUDIENCE
);

if (process.argv[2] == "init") main.init();

const app = server()
  .getFile("/", join(__dirname, "public", "index.html"))
  .getFile(ADMIN_PATH, join(__dirname, "public", "admin.html"))
  .getFile(CALLBACK_PATH, join(__dirname, "public", "callback.html"))
  .getFile(TASK_PATH + "/:id", join(__dirname, "public", "task.html"))
  .get(RESULT_PATH + "/:id", async (req, res) => {
    res.json(await main.result(req.auth, req.params.id));
  })
  .post("/", async (req, res) => {
    if (isDevelopment) {
      const body = JSON.stringify(req.body);
      console.log(`=== START TASK @ ${new Date().toISOString()} ===> ${body}`);
    }

    if (req.body.callbackUri)
      return res.redirect(await main.createTask(req.auth, req.body));

    const ui = new TaskUIHeadless(req);
    return res.json(await main.headlessTask(req.auth, ui, req.body));
  })
  .websocket(TASK_PATH + "/:id", async (req, ws) => {
    const ui = new TaskUIWebsocket(req, ws);
    ui.spinner("Connected...");
    await main.websocketTask(req.params.id, ui);
  })
  .get(ADMIN_PATH + "/authorize", async (_req, res) => {
    const adminPath = Configuration.BASE_URL + ADMIN_PATH;
    if (adminPath !== Configuration.ADMIN_AUTHORIZE_URL)
      return res.redirect(Configuration.ADMIN_AUTHORIZE_URL);

    const idToken = jwtSign(
      {
        aud: Configuration.ADMIN_JWT_AUDIENCE,
        sub: "admin",
      },
      Configuration.ADMIN_JWT_SECRET
    );
    return res.redirect(`${adminPath}#id_token=${idToken}`);
  })
  .get(ADMIN_PATH + "/api/connectors", async (req, res) => {
    const user = await userFromIdToken(req.headers);
    res.json(await main.connectors(user));
  })
  .get(ADMIN_PATH + "/api/connections", async (req, res) => {
    const user = await userFromIdToken(req.headers);
    res.json(await main.connections(user));
  })
  .post(ADMIN_PATH + "/api/connections", async (req, res) => {
    const user = await userFromIdToken(req.headers);
    res.json(await main.createConnection(user, req.body));
  })
  .put(ADMIN_PATH + "/api/connections", async (req, res) => {
    const user = await userFromIdToken(req.headers);
    res.json(await main.setConnectionConfig(user, req.body));
  })
  .delete(ADMIN_PATH + "/api/connections", async (req, res) => {
    const user = await userFromIdToken(req.headers);
    res.json(await main.detroyConnection(user, req.body));
  })
  .use((err, req, res, _next) => {
    console.error(`${new Date().toISOString()}: ${req.method} ${req.url}`);
    console.error(err);

    if (err.statusCode)
      return res
        .status(err.statusCode)
        .json({ message: err.message || http.STATUS_CODES[err.statusCode] });

    return res.status(500).json({});
  })
  .listen(Configuration.PORT, () => {
    console.log(`Listening on port ${Configuration.PORT}.`);
  });

process.on("SIGINT", () => {
  console.log("Closing server...");
  app.close(() => {
    console.log("Closed server");
  });
});
