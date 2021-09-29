const env = {
  PORT: parseInt(process.env.PORT) || 3000,
  DATABASE_URL: process.env.DATABASE_URL || "sqlite::memory:",
  SECRET_KEY: process.env.SECRET_KEY || "SecretKey",
  REDIS_URL: process.env.REDIS_URL || "",
  BASE_URL: process.env.BASE_URL || "http://localhost:3000",
  ADMIN_AUTHORIZE_URL: process.env.ADMIN_AUTHORIZE_URL,
  ADMIN_JWT_ALGORITHM: process.env.ADMIN_JWT_ALGORITHM || "HS256",
  ADMIN_JWT_SECRET: process.env.ADMIN_JWT_SECRET,
  ADMIN_JWT_AUDIENCE: process.env.ADMIN_JWT_AUDIENCE,
};

export default env;
