<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <a href="/message" class="breadcrumbs__link"><span>Message configuration</span></a>
- <span class="breadcrumbs__link">Delivery Status Notifications (DSN)</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# Delivery Status Notifications (DSN)

</div>

<div class="theme-admonition theme-admonition-info admonition_xJq3 alert alert--info">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTQgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTcgMi4zYzMuMTQgMCA1LjcgMi41NiA1LjcgNS43cy0yLjU2IDUuNy01LjcgNS43QTUuNzEgNS43MSAwIDAgMSAxLjMgOGMwLTMuMTQgMi41Ni01LjcgNS43LTUuN3pNNyAxQzMuMTQgMSAwIDQuMTQgMCA4czMuMTQgNyA3IDcgNy0zLjE0IDctNy0zLjE0LTctNy03em0xIDNINnY1aDJWNHptMCA2SDZ2Mmgydi0yeiIgLz48L3N2Zz4=)</span>info

</div>

<div class="admonitionContent_BuS1">

The SMTP **Delivery Status Notification** (DSN) extension (defined in <a href="https://datatracker.ietf.org/doc/html/rfc3461" target="_blank" rel="noopener noreferrer">RFC 3461</a>) is **optional**. Your SMTP server must advertise DSN support in its `EHLO` response for these options to have any effect.

</div>

</div>

Delivery Status Notifications allow you to receive automatic email reports about what happens to your messages after they leave your server. You can request notifications when a message is successfully delivered, when delivery is delayed, or when delivery fails permanently (bounces).

To request DSN for a message, add a **`dsn`** object to your [message configuration](/message/) when calling `transporter.sendMail()`.

## `dsn` object fields<a href="#dsn-object-fields" class="hash-link" aria-label="Direct link to dsn-object-fields" translate="no" title="Direct link to dsn-object-fields">​</a>

| Property | Type | Description | Corresponding SMTP keyword |
|----|----|----|----|
| `id` | `string` | A unique identifier for this message that will be included in any DSN reports you receive. This helps you match notifications back to the original message. | **ENVID** |
| `return` | `'headers' | 'full'` | Controls how much of the original message is included in the DSN. Use `'headers'` to include only the message headers, or `'full'` to include the complete original message. | **RET** |
| `notify` | `string | string[]` | Specifies which events should trigger a notification. Valid values are `'success'`, `'failure'`, `'delay'`, or `'never'`. You can combine multiple values (except `'never'`, which must be used alone). | **NOTIFY** |
| `recipient` | `string` | The original recipient address to include in the DSN. Nodemailer automatically formats this with the required `rfc822;` prefix if not provided. | **ORCPT** |

> Nodemailer automatically escapes special characters in DSN values according to the <a href="https://datatracker.ietf.org/doc/html/rfc3461#section-4" target="_blank" rel="noopener noreferrer">xtext</a> encoding rules defined in RFC 3461.

## Examples<a href="#examples" class="hash-link" aria-label="Direct link to Examples" translate="no" title="Direct link to Examples">​</a>

### 1. Request a notification when the message is delivered<a href="#1-request-a-notification-when-the-message-is-delivered" class="hash-link" aria-label="Direct link to 1. Request a notification when the message is delivered" translate="no" title="Direct link to 1. Request a notification when the message is delivered">​</a>

This example requests a success notification, so you will receive an email confirmation when the recipient's mail server accepts the message for final delivery.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 587,
  secure: false,
  auth: {
    user: "smtp-user",
    pass: "smtp-pass",
  },
});

await transporter.sendMail({
  from: "sender@example.com",
  to: "recipient@example.com",
  subject: "Message",
  text: "I hope this message gets read!",
  dsn: {
    id: "msg-123",
    return: "headers",
    notify: "success",
    recipient: "sender@example.com",
  },
});
```

</div>

</div>

### 2. Request notifications for failures and delays<a href="#2-request-notifications-for-failures-and-delays" class="hash-link" aria-label="Direct link to 2. Request notifications for failures and delays" translate="no" title="Direct link to 2. Request notifications for failures and delays">​</a>

This example requests notifications for both permanent failures (bounces) and temporary delays. This is useful when you want to be alerted if something goes wrong but do not need confirmation of successful delivery.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
await transporter.sendMail({
  from: "sender@example.com",
  to: "recipient@example.com",
  subject: "Message",
  text: "I hope this message gets read!",
  dsn: {
    id: "msg-124",
    return: "headers",
    notify: ["failure", "delay"],
    recipient: "sender@example.com",
  },
});
```

</div>

</div>

### 3. Disable DSN reports entirely<a href="#3-disable-dsn-reports-entirely" class="hash-link" aria-label="Direct link to 3. Disable DSN reports entirely" translate="no" title="Direct link to 3. Disable DSN reports entirely">​</a>

If you explicitly do **not** want to receive any DSN reports for a message, set `notify` to `'never'`. This tells the receiving server that you do not want notifications under any circumstances.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
await transporter.sendMail({
  /* ... other message options ... */
  dsn: {
    notify: "never",
  },
});
```

</div>

</div>

## Troubleshooting<a href="#troubleshooting" class="hash-link" aria-label="Direct link to Troubleshooting" translate="no" title="Direct link to Troubleshooting">​</a>

- **Not receiving DSN reports?** Verify that your [SMTP server](/smtp) supports the DSN extension by checking its `EHLO` response. The server must list `DSN` as one of its supported extensions. Also ensure you are not forcing a downgrade to the legacy `HELO` command, which does not support extensions.
- **Incomplete or missing information in reports?** Some email service providers only support a subset of DSN options or may modify certain values. Check your provider's documentation for any limitations or provider-specific behavior.

</div>

<a href="/message/list-headers" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

List headers

</div>

<a href="/message/custom-source" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

Custom source

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#dsn-object-fields" class="table-of-contents__link toc-highlight"><code>dsn</code> object fields</a>
- <a href="#examples" class="table-of-contents__link toc-highlight">Examples</a>
  - <a href="#1-request-a-notification-when-the-message-is-delivered" class="table-of-contents__link toc-highlight">1. Request a notification when the message is delivered</a>
  - <a href="#2-request-notifications-for-failures-and-delays" class="table-of-contents__link toc-highlight">2. Request notifications for failures and delays</a>
  - <a href="#3-disable-dsn-reports-entirely" class="table-of-contents__link toc-highlight">3. Disable DSN reports entirely</a>
- <a href="#troubleshooting" class="table-of-contents__link toc-highlight">Troubleshooting</a>

</div>

</div>

</div>

</div>

</div>
