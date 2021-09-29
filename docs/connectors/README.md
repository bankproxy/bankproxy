# Connectors

## at.oberbank.banking

This connector uses the _Kundenportal_ web interface accessible via [https://www.banking-oberbank.at/web/oberbank/login](https://www.banking-oberbank.at/web/oberbank/login) to access the accounts.

- `IBAN`: IBAN of the account

## at.raiffeisen.elba

This connector uses the _Mein ELBA_ web interface accessible via [https://mein.elba.raiffeisen.at/](https://mein.elba.raiffeisen.at/) to access the accounts.

- `IBAN`: IBAN of the account

## at.sparda.banking

This connector uses the _Mein ELBA_ web interface accessible via [https://banking.sparda.at/](https://banking.sparda.at/) to access the accounts.

- `IBAN`: IBAN of the account

## at.sparkasse.george

This connector uses the _George_ web interface accessible via [https://george.sparkasse.at/](https://george.sparkasse.at/) to access the accounts.

- `IBAN`: IBAN of the account

## com.erstegroup.eboe

This connector uses the _ErsteConnect_ REST API to access the accounts. Using it requires a _Qualified Website Authentication Certificate_.

- `ClientCertificate`: Public certificate to access the API (in PEM format)
- `ClientCertificateKey`: Private key to access the API (in PEM format)
- `IBAN`: IBAN of the account
- `OAuthClientId`: OAuth ClientId form the developer portal
- `OAuthClientSecret`: OAuth ClientSecret form the developer portal

## com.erstegroup.ersteconnect

This connector uses the _ErsteConnect_ REST API to access the accounts. Using it requires a special certificate and a contract from bank.

- `ClientCertificate`: Public certificate to access the API (in PEM format)
- `ClientCertificateKey`: Private key to access the API (in PEM format)
- `IBAN`: IBAN of the account
- `OAuthClientId`: OAuth ClientId form the developer portal
- `OAuthClientSecret`: OAuth ClientSecret form the developer portal
- `WebApiKey`: Web-Api-Key form the developer portal

## com.holvi.app

This connector uses the _Holvi_ web interface accessible via [https://login.app.holvi.com/](https://login.app.holvi.com/) to access the accounts.

- `IBAN`: IBAN of the account

## net.foodcoops.foodsoft

This connector uses the REST API to access the financial transactions of an [Foodsoft](https://foodcoops.net) ordergroup.

- `IBAN`: Dummy IBAN, e.g. `ZZ75FOODSOFT`
- `InstanceUrl`: The URL of the foodsoft instance, e.g. `https://app.foodcoops.net/demo`
- `OAuthClientId`: OAuth ClientId
- `OAuthClientSecret`: OAuth ClientSecret
