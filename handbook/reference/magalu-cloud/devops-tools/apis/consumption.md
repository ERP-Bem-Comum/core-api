# Consumption

## usage
- getRetrieve D-1 consumption in FOCUS format

## Consumption API (v1)

Public Magalu Cloud D-1 consumption API for retrieving usage data in FOCUS v1.0 format.

### usage

#### Retrieve D-1 consumption in FOCUS format

Returns monthly usage data in FOCUS v1.0 format.

To authenticate, create an API Key using the official procedure at [How to create an API Key](https://docs.magalu.cloud/docs/devops-tools/api-keys/how-to/other-products/create-api-key/).

When creating the key, select the **Magalu Cloud > tally-consumption-api** application/scope.

##### Authorizations:

_ApiKeyAuth_

##### Query Parameters

**accrual_period** (required)

- Type: string
- Pattern: `^\d{4}-(0[1-9]|1[0-2])$`
- Example: `accrual_period=2026-04`
- Description: Consumption period in YYYY-MM format.

### Responses

- **200**: Successful Response
- **400**: Bad Request
- **422**: Validation Error
- **500**: Internal Server Error

### Endpoint

```
GET /usage
https://api.magalu.cloud/consumption/usage
```

### Request Example

```bash
curl --request GET \
  --url 'https://api.magalu.cloud/consumption/usage?accrual_period=2026-04' \
  --header 'x-api-key: {API_KEY}'
```

### Response Example (200)

```json
{
  "accrual_period": "2026-04",
  "results": [
    {
      "SkuId": "sku-1",
      "ConsumedQuantity": "1.000000000000000",
      "ConsumedUnit": "instances*seconds",
      "BillingAccountId": "00000000-0000-0000-0000-000000000000",
      "BillingCurrency": "BRL",
      "BillingPeriodStart": "2025-01-01T00:00:00+00:00",
      "BillingPeriodEnd": "2025-02-01T00:00:00+00:00",
      "ChargePeriodStart": "2025-01-10T10:00:00+00:00",
      "ChargePeriodEnd": "2025-01-10T11:00:00+00:00",
      "BilledCost": "0.100000000000000",
      "ProviderName": "Magalu Cloud"
    }
  ]
}
```
