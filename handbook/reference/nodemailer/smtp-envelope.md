<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <a href="/smtp" class="breadcrumbs__link"><span>SMTP transport</span></a>
- <span class="breadcrumbs__link">SMTP envelope</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# SMTP envelope

</div>

When Nodemailer delivers an email over SMTP, it sends **two distinct layers** of information:

1.  **Message headers** - the visible metadata that email clients display to recipients (`From:`, `To:`, `Subject:`, etc.).
2.  **SMTP envelope** - the routing instructions (`MAIL FROM`, `RCPT TO`) that mail servers use to deliver the message and handle bounces. These instructions are separate from the headers and are not visible to recipients.

By default, Nodemailer **builds the envelope automatically** by extracting email addresses from the `from`, `to`, `cc`, and `bcc` fields you provide. For most use cases, this automatic behavior is exactly what you need.

However, if you need precise control over the envelope, you can override the defaults with the `envelope` property. Common reasons to do this include:

- Implementing <a href="https://en.wikipedia.org/wiki/Variable_envelope_return_path" target="_blank" rel="noopener noreferrer">VERP</a> (Variable Envelope Return Path) for per-recipient bounce tracking
- Setting a dedicated bounce address that differs from the visible `From:` header
- Sending a message to recipients who should **not** appear in the visible headers

## The `envelope` property<a href="#the-envelope-property" class="hash-link" aria-label="Direct link to the-envelope-property" translate="no" title="Direct link to the-envelope-property">​</a>

<div class="language-js codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` js
{
  envelope: {
    from: 'bounce+12345@example.com',          // becomes MAIL FROM:
    to:   [                                    // becomes RCPT TO:
      'alice@example.com',
      'Bob <bob@example.net>'
    ],
    requireTLSExtensionEnabled: true
  }
}
```

</div>

</div>

| Field | Type | Description |
|----|----|----|
| `from` | `string` | The address used for the **`MAIL FROM`** command (the return path where bounces are sent). |
| `to` | `string | string[]` | Address(es) added to the **`RCPT TO`** list (the actual delivery destinations). |
| `cc` | `string | string[]` | *Optional.* These addresses are merged into the `to` list when the envelope is generated. |
| `bcc` | `string | string[]` | *Optional.* These addresses are merged into the `to` list when the envelope is generated. |
| `requireTLSExtensionEnabled` | `boolean` | *Optional.* If `true`, the `REQUIRETLS` extension is used (RFC 8689). This requires a TLS connection. |

Nodemailer accepts any [address format](/message/addresses) it supports: plain email addresses like `user@example.com`, name-address pairs like `Name <address>`, or internationalized addresses with UTF-8 domains.

### Complete example<a href="#complete-example" class="hash-link" aria-label="Direct link to Complete example" translate="no" title="Direct link to Complete example">​</a>

<div class="language-js codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` js
const nodemailer = require("nodemailer");

async function main() {
  // Create a transport (replace with your own transport options)
  const transport = nodemailer.createTransport({
    sendmail: true,
  });

  const info = await transport.sendMail({
    from: "Mailer <mailer@example.com>", // Visible From: header
    to: "Daemon <daemon@example.com>",   // Visible To: header
    envelope: {
      from: "bounce+12345@example.com",  // Actual MAIL FROM (for bounces)
      to: [
        // Actual RCPT TO recipients (who really receive the email)
        "daemon@example.com",
        "mailer@example.com",
      ],
    },
    subject: "Custom SMTP envelope",
    text: "Hello!",
  });

  console.log("Envelope used:", info.envelope);
  // => { from: 'bounce+12345@example.com', to: [ 'daemon@example.com', 'mailer@example.com' ] }
}

main().catch(console.error);
```

</div>

</div>

<div class="theme-admonition theme-admonition-tip admonition_xJq3 alert alert--success">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTIgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTYuNSAwQzMuNDggMCAxIDIuMTkgMSA1YzAgLjkyLjU1IDIuMjUgMSAzIDEuMzQgMi4yNSAxLjc4IDIuNzggMiA0djFoNXYtMWMuMjItMS4yMi42Ni0xLjc1IDItNCAuNDUtLjc1IDEtMi4wOCAxLTMgMC0yLjgxLTIuNDgtNS01LjUtNXptMy42NCA3LjQ4Yy0uMjUuNDQtLjQ3LjgtLjY3IDEuMTEtLjg2IDEuNDEtMS4yNSAyLjA2LTEuNDUgMy4yMy0uMDIuMDUtLjAyLjExLS4wMi4xN0g1YzAtLjA2IDAtLjEzLS4wMi0uMTctLjItMS4xNy0uNTktMS44My0xLjQ1LTMuMjMtLjItLjMxLS40Mi0uNjctLjY3LTEuMTFDMi40NCA2Ljc4IDIgNS42NSAyIDVjMC0yLjIgMi4wMi00IDQuNS00IDEuMjIgMCAyLjM2LjQyIDMuMjIgMS4xOUMxMC41NSAyLjk0IDExIDMuOTQgMTEgNWMwIC42Ni0uNDQgMS43OC0uODYgMi40OHpNNCAxNGg1Yy0uMjMgMS4xNC0xLjMgMi0yLjUgMnMtMi4yNy0uODYtMi41LTJ6IiAvPjwvc3ZnPg==)</span>tip

</div>

<div class="admonitionContent_BuS1">

The object returned by `sendMail()` always includes an `envelope` property showing what was actually sent. It contains `from` (a string with the sender address) and `to` (an array of all recipient addresses). When building the envelope, Nodemailer merges **all** recipients from `to`, `cc`, and `bcc` into that single `to` array.

</div>

</div>

------------------------------------------------------------------------

### When should I override the envelope?<a href="#when-should-i-override-the-envelope" class="hash-link" aria-label="Direct link to When should I override the envelope?" translate="no" title="Direct link to When should I override the envelope?">​</a>

- **VERP or bounce management** - Route bounces to a unique per-message or per-recipient address so you can track which specific email bounced. For automated bounce notifications, see also [Delivery Status Notifications (DSN)](/message/dsn).
- **Mailing lists** - Deliver the same message to many recipients while keeping their addresses hidden from each other (not shown in the headers).
- **Different return path** - Display one address in the `From:` header but route bounces to a different address for centralized bounce processing.

If you do not have a specific reason to customize the envelope, let Nodemailer generate it automatically from your message headers.

</div>

<a href="/smtp/pooled" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

Pooled SMTP Connections

</div>

<a href="/smtp/proxies" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

Proxy support

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#the-envelope-property" class="table-of-contents__link toc-highlight">The <code>envelope</code> property</a>
  - <a href="#complete-example" class="table-of-contents__link toc-highlight">Complete example</a>
  - <a href="#when-should-i-override-the-envelope" class="table-of-contents__link toc-highlight">When should I override the envelope?</a>

</div>

</div>

</div>

</div>

</div>
