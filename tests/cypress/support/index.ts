import { sign as jwtSign } from "jsonwebtoken";

const TEST_IBAN = "GB33BUKB20201555555555";

function withBaseUrl(path) {
  return Cypress.config().baseUrl + path;
}

Cypress.Commands.add("createConnection", (type = "com.example.test") => {
  const jwtAud = Cypress.env("jwt_audience");
  const jwtSecret = Cypress.env("jwt_secret");
  const jwtSub = "subject";

  return cy
    .request({
      method: "POST",
      url: "/admin/api/connections",
      auth: {
        bearer: jwtSign({ aud: jwtAud, sub: jwtSub }, jwtSecret),
      },
      body: {
        config: {
          iban: TEST_IBAN,
        },
        type,
      },
    })
    .then((res) => {
      return res.body.credentials;
    });
});

Cypress.Commands.add("createTask", { prevSubject: true }, (connection) => {
  const auth = {
    user: connection.clientId,
    pass: connection.clientSecret,
  };

  const callbackUri = withBaseUrl(
    `/__CALLBACK__/?auth=${JSON.stringify(auth)}`
  );

  return cy
    .request({
      method: "POST",
      url: "/",
      auth,
      followRedirect: false,
      body: {
        callbackUri,
        accounts: [
          {
            iban: TEST_IBAN,
          },
        ],
      },
    })
    .then((res) => {
      return { url: res.headers.location };
    });
});

Cypress.Commands.add("getResult", () => {
  cy.url().should("contain", "result");

  return cy
    .url()
    .then((url) => new URL(url))
    .then((url) => {
      const params = url.searchParams;
      cy.request({
        url: withBaseUrl(params.get("result")),
        auth: JSON.parse(params.get("auth")),
        failOnStatusCode: false,
      });
    });
});
