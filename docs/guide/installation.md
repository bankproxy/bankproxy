# Installation

BankProxy provides a pre-built Docker container for deployment. For a quick start it can be run with the following command:

```sh
docker run -it -p 3000:3000 \
  -e BASE_URL=http://localhost:3000 \
  -e ADMIN_AUTHORIZE_URL=http://localhost:3000/admin \
  -e ADMIN_JWT_SECRET=AdminJwtSecret \
  ghcr.io/bankproxy/bankproxy:latest npm start init
```

It provides the following environment variables for configuration:

- `PORT`: Port to bind the service to, defaults to `3000`
- `DATABASE_URL`: URL to the Database server, e.g. `postgres://user:pass@host/database`. If not specified, a temporary in-memory database without persistence will be used.
- `SECRET_KEY`: Key for encryption, e.g. `2c31ff7560eddb214c85853b952af7ee`.
- `REDIS_URL`: URL to the Redis server, e.g. `redis://host`. If not specififed, a temporary in-memory alternative will be used.
- `BASE_URL`: Public base URL of the service , e.g. `https://bankproxy.example.com`. If run behind a reverse proxy, the public access URL should be set.
- `ADMIN_AUTHORIZE_URL`: URL to redirect for authorization in the admin interface.
- `ADMIN_JWT_ALGORITHM`: Algorithm used to sign the admin access JWT, defaults to `HS256`
- `ADMIN_JWT_SECRET`: Secret used to sign the admin access JWT
- `ADMIN_JWT_AUDIENCE`: Expected `aud` in the admin access JWT

Running the container with `npm start init` will initialize all required ressoucres like the database schema. Since this could destroy stored data it's recommended to run the container with the default command (`npm start`) to avoid accidental data loss.

**The server must be run behind some HTTP reverse proxy with WebSocket support to be secure.** Depolyment without a reverse proxy should be used only in a setup, where the **headless** mode of BankProxy is the sole mode of operation.
