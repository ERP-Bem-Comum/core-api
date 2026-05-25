# Auditoria

## Cloud Events Consult API (v1)

The Auditoria API enables consultation of events emitted by other Magalu Cloud products.

### Events Endpoint

**Lists all events**

Retrieves events emitted across Magalu Cloud products.

**Authentication:** OAuth2

**Query Parameters:**
- `_limit` (integer, default: 50): Items per page [0 .. 2147483647]
- `_offset` (integer, default: 0): Pagination offset [0 .. 2147483647]
- `id` (string): Event identification
- `source__like` (string): Context where event occurred
- `time` (string): Timestamp of occurrence
- `type__like` (string): Event type related to originating occurrence
- `product__like` (string): Producer product where event occurred
- `authid` (string): Principal identification triggering occurrence
- `data` (object): Raw event data

**Header Parameters:**
- `X-Tenant-ID` (required)

**Endpoint:** `GET /v0/events`

**Servers:**
- br-ne1: `https://api.magalu.cloud/br-ne1/audit/v0/events`
- br-se1: `https://api.magalu.cloud/br-se1/audit/v0/events`

**Responses:** 200 (Success), 422 (Validation Error), 500 (Internal Server Error)

### Event Types Endpoint

**Lists all event types**

Retrieves available event types emitted by Magalu Cloud products.

**Authentication:** OAuth2

**Query Parameters:**
- `_limit` (integer, default: 50)
- `_offset` (integer, default: 0)

**Header Parameters:**
- `X-Tenant-ID` (required)

**Endpoint:** `GET /v0/event-types`

**Servers:**
- br-ne1: `https://api.magalu.cloud/br-ne1/audit/v0/event-types`
- br-se1: `https://api.magalu.cloud/br-se1/audit/v0/event-types`

**Responses:** 200 (Success), 422 (Validation Error), 500 (Internal Server Error)
