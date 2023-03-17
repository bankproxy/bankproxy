# BankProxy

[![Test Status](https://github.com/bankproxy/bankproxy/actions/workflows/test.yml/badge.svg)](https://github.com/bankproxy/bankproxy/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/bankproxy/bankproxy/branch/main/graph/badge.svg)](https://codecov.io/gh/bankproxy/bankproxy)
[![LICENSE](https://img.shields.io/github/license/bankproxy/bankproxy.svg)](LICENSE)

BankProxy is a service, which helps with the interaction with the interfaces of banks. It supports the retrieval of transactions and initiation of payments. The interface is based on the [_NextGenPSD2_](https://www.berlin-group.org/psd2-access-to-bank-accounts) standard of the [_Berlin Group_](https://www.berlin-group.org/) for maximum interoperability.

The service is meant to be deployed beside other services which need access to bank accounts. It provides a unified interface and provides an additional layer of security for handling sensitive login credentials.

BankProxy can call standardized REST API endpoints, parses the HTTP responses of the online banking interface or controls a whole browser instance, to interact with the bank. Which behavior will be used, depends on the selected _connector_, which must be configured for every account.

## Documentation

Detailed information about BankProxy can be found at https://bankproxy.github.io.

## Installation

### Docker (recommended)

Docker is the recommended way to use BankProxy.

```
docker run -p 3000:3000 ghcr.io/bankproxy/bankproxy
```

### Manual installation

To run BankProxy a working [Node.js](https://nodejs.org/) installation (at least v15.0) with [npm](https://npmjs.com/) is required. To be able to use all supported banks all dependencies of the [Chromium](https://chromium.org/) browser must be installed. The easiest way to accomplish that is to just install Chromium via the system package manager.

When all dependencies are met BankProxy can be started with the following commands:

```sh
git clone https://github.com/bankproxy/bankproxy
cd bankproxy
npm install --production
npm start
```

## Configuration

To run BankProxy in production a few environment variables must be set:

- `PORT`: Port to bind the service to, e.g. `3000`
- `DATABASE_URL`: URL to the Database server, e.g. `postgres://user:pass@host/database`
- `SECRET_KEY`: Key for encryption, e.g. `2c31ff7560eddb214c85853b952af7ee`
- `REDIS_URL`: URL to the Redis server, e.g. `redis://host`
- `BASE_URL`: Public base URL of the service, e.g. `https://bankproxy.example.com`
- `ADMIN_AUTHORIZE_URL`: URL to redirect for authorization in the admin interface,
- `ADMIN_JWT_ALGORITHM`: Algorithm used to sign the admin access JWT
- `ADMIN_JWT_SECRET`: Secret used to sign the admin access JWT
- `ADMIN_JWT_AUDIENCE`: Expected `aud` in the admin access JWT

Please check out the [documentation](https://bankproxy.github.io) for more details about the configuration.

## License

All the code in this repository is released under the **_GNU Affero General Public License v3.0_**, for more information take a look at the [LICENSE] file.

Please write a mail to paroga@paroga.com if you need support for additional banks or have different license requirements (e.g. **commercial license**).
