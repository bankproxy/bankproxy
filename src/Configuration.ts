import { readFileSync } from "fs";

const env = {
  PORT: 3000,
  DATABASE_URL: "sqlite::memory:",
  SECRET_KEY: "SecretKey",
  REDIS_URL: "",
  BASE_URL: "http://localhost:3000",
  ADMIN_AUTHORIZE_URL: "",
  ADMIN_JWT_ALGORITHM: "HS256",
  ADMIN_JWT_SECRET: "",
  ADMIN_JWT_AUDIENCE: "",
};

for (const key of Object.keys(env)) {
  let value = process.env[key];
  const fileName = process.env[key + "_FILE"];
  if (fileName) value = readFileSync(fileName, "utf8");
  if (!value) continue;
  env[key] = typeof env[key] === "number" ? parseInt(value) : value;
}

export default env;
