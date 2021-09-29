# Administrations

To interact with a bank account, BankProxy needs a configuration for **every** account you want to interact with. The exact configuration options depend on the used bank and can be found in [Connectors](/connectors).

## Create A Connection Via API

To create a connection you need to send a JSON object via HTTP POST to the `/admin/adi/connections` endpoint. This endpoint requires a valid [JWT](https://jwt.io/) token with `aud` set to the value of the `ADMIN_JWT_AUDIENCE` environment variable signed with the `ADMIN_JWT_SECRET`.

### JWT

The following JWT payload

```
{
  "aud": "bankproxy",
  "sub": "admin",
  "iat": 1577833200,
  "exp": 1577833800
}
```

signed with the `HS256` algorithm and the secret `your-256-bit-secret` would look like:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJiYW5rcHJveHkiLCJzdWIiOiJhZG1pbiIsImlhdCI6MTU3NzgzMzIwMCwiZXhwIjoxNTc3ODMzODAwfQ.4ffP6sLo9a47O-2bNo_SNdb-f_PwvDuMLk8dUUmcsFc
```

Please ensure that the _expires at_ property `exp` is set correctly.

### Create The Connection

With a valid JWT a HTTP request can be sent to bankproxy.

```http
POST /admin/api/connections HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...-f_PwvDuMLk8dUUmcsFc
Content-Type: application/json

{
  "type": "com.example.test",
  "name": "Test Connection",
  "config": {
    "IBAN": "AT251657674147449499"
  }
}
```

- `type` must be a valid _connector id_ as listed at [Connectors](/connectors).
- `name` is an optional name for the connection.
- `config` contains all configuration options for the type `type`.

The server will then respond with a JSON object containing the credentials required to use the connection:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "credentials": {
    "clientId": "18d81f83b5fb6bf354a36b29c8ca9cd7",
    "clientSecret": "894a90094f73d808eb46087715c4a2e2"
  }
}
```

## Create A Connection Via UI

BankProxy provides a simple user interface for creating connections, which can be found at `/admin` on the BankProxy instance.
