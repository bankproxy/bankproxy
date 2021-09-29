import { findPort } from "find-open-port";
import { spawn } from "child_process";

const JWT_SECRET = "AdminJwtSecret";
const JWT_AUDIENCE = "AdminJwtAudience";

findPort().then((port) => {
  console.log(`Using port ${port} for testing.`);

  const env = process.env;
  env.PORT = `${port}`;
  env.DATABASE_URL = "sqlite::memory:";
  env.SECRET_KEY = "SecretKey";
  env.REDIS_URL = "";
  env.BASE_URL = `http://localhost:${port}`;
  env.ADMIN_JWT_SECRET = JWT_SECRET;
  env.ADMIN_JWT_AUDIENCE = JWT_AUDIENCE;

  const proc = spawn(
    "nyc",
    [
      "--reporter=html",
      "--reporter=json",
      "--report-dir=coverage/e2e",
      "ts-node",
      "index.ts",
      "init",
    ],
    { env, stdio: "inherit" }
  );

  env.CYPRESS_BASE_URL = `http://localhost:${port}`;

  const cypress = spawn(
    "cypress",
    [
      "run",
      "--project",
      "tests",
      "--env",
      `jwt_audience=${JWT_AUDIENCE},jwt_secret=${JWT_SECRET}`,
    ],
    { env, stdio: "inherit" }
  );

  cypress.on("close", (code) => {
    proc.on("close", () => process.exit(code));
    proc.kill("SIGINT");
    setTimeout(() => proc.kill("SIGTERM"), 5000);
  });
});
