# Execution

## Authorization

To start an execution the `clientId` and `clientSecret` for the connection must be sent via the ['Basic' HTTP Authentication Scheme](https://tools.ietf.org/html/rfc7617).

For the `clientId` `18d81f83b5fb6bf354a36b29c8ca9cd7` and `clientSecret` `894a90094f73d808eb46087715c4a2e2` the value of the `Authorization` header would look like:

```
Basic MThkODFmODNiNWZiNmJmMzU0YTM2YjI5YzhjYTljZDc6ODk0YTkwMDk0ZjczZDgwOGViNDYwODc3MTVjNGEyZTI=
```

## UI Mode

To start an interaction you need to send a HTTP POST request to BankProxy **with** the `callbackUri` set.

```http
POST / HTTP/1.1
Authorization: Basic MThkODFmODNiNWZiNmJm...NDYwODc3MTVjNGEyZTI=
Content-Type: application/json

{
  "callbackUri": "https://example.com/callback",
  "accounts": [
    {
      "iban": "AT251657674147449499"
    }
  ]
}
```

BankProxy will respond to it with an URL in the `Location` header.

```http
HTTP/1.1 200 OK
Location: https://bankproxy.example.com/task/f4f59857bb369265c4b3
```

The end-user must then redirected to the returned URL.

After successful interaction with the bank, BankProxy will redirect the end-user to the `callbackUri` from the original request and append `result` parameter like:

```
https://example.com/callback?result=54f65bf4969257b692ff6583c4b3
```

With the result identifier the result can be requested from BankProxy, by appending the `result` to the BankProxy root URL:

```http
GET /54f65bf4969257b692ff6583c4b3 HTTP/1.1
Authorization: Basic MThkODFmODNiNWZiNmJm...NDYwODc3MTVjNGEyZTI=
```

BankProxy will respond with the result and will delete it from it's internal storage, so requesting the same result twice will not work:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "result": [
    {
      "account": {
        "iban": "AT251657674147449499"
      },
      "balances": [
        {
          "balanceAmount": {
            "currency": "EUR",
            "amount": "123"
          },
          "balanceType": "closingBooked"
        }
      ],
      "transactions": {
        "booked": [
          {
            "transactionId": "3dc3d5b3-7023-4848-9853-f5400a64e80f",
            "entryReference": "674141474",
            "bookingDate": "2019-08-24",
            "valueDate": "2019-08-24",
            "transactionAmount": {
              "currency": "EUR",
              "amount": "123"
            },
            "creditorName": "Creditor Name"
          }
        ]
      }
    }
  ]
}
```

To get only transactions since the last request, it's possible to specify the `dateFrom` and `entryReferenceFrom` properties:

```http
POST / HTTP/1.1
Authorization: Basic MThkODFmODNiNWZiNmJm...NDYwODc3MTVjNGEyZTI=
Content-Type: application/json

{
  "callbackUri": "https://example.com/callback",
  "accounts": [
    {
      "iban": "AT251657674147449499",
      "dateFrom": "2019-08-24",
      "dateTo": "9999-12-31",
      "entryReferenceFrom": "674141474"
    }
  ]
}
```

Payments can be initiated with the `payments` property:

```http
POST / HTTP/1.1
Authorization: Basic MThkODFmODNiNWZiNmJm...NDYwODc3MTVjNGEyZTI=
Content-Type: application/json

{
  "accounts": [
    {
      "iban": "AT251657674147449499",
      "dateFrom": "2019-08-24",
      "dateTo": "9999-12-31",
      "entryReferenceFrom": "674141474"
    }
  ],
  "payments": {
    "sepaCreditTransferPayments": [
      {
        "instructedAmount": {
          "currency": "EUR",
          "amount": "123.50"
        },
        "debtorAccount": {
          "iban": "AT251657674147449499"
        },
        "creditorName": "Merchant123",
        "creditorAccount": {
          "iban": "DE02100100109307118603"
        },
        "remittanceInformationUnstructured": "Ref Number Merchant"
      },
      {
        "instructedAmount": {
          "currency": "EUR",
          "amount": "45.90"
        },
        "debtorAccount": {
          "iban": "AT251657674147449499"
        },
        "creditorName": "Other Merchant",
        "creditorAccount": {
          "iban": "FR7612345987650123456789014"
        },
        "remittanceInformationUnstructured": "Invoice 78342"
      }
    ]
  }
}
```

Information about the success of payments is not available in the result object, but directly during the end-user interaction. Usually executed payments can be found in the returned transactions.

## Headless Mode

BankProxy supports an additional way to interact with the bank, to allow automatic retrieval of transaction without user interaction.

**Please note that this mode is not supported for all banks, since users can not e.g. confirm a two-factor login this way.**

To start an interaction you need to send a HTTP POST request to BankProxy **without** the `callbackUri` set.

```http
POST / HTTP/1.1
Authorization: Basic MThkODFmODNiNWZiNmJm...NDYwODc3MTVjNGEyZTI=
Content-Type: application/json

{
  "accounts": [
    {
      "iban": "AT251657674147449499"
    }
  ]
}
```

BankProxy will respond to it directly with the result.

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "result": [
    {
      "account": {
        "iban": "AT251657674147449499"
      },
      "balances": [
        {
          "balanceAmount": {
            "currency": "EUR",
            "amount": "123"
          },
          "balanceType": "closingBooked"
        }
      ],
      "transactions": {
        "booked": [
          {
            "transactionId": "3dc3d5b3-7023-4848-9853-f5400a64e80f",
            "entryReference": "674141474",
            "bookingDate": "2019-08-24",
            "valueDate": "2019-08-24",
            "transactionAmount": {
              "currency": "EUR",
              "amount": "123"
            },
            "creditorName": "Creditor Name"
          }
        ]
      }
    }
  ]
}
```
