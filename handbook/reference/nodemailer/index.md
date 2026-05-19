<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <span class="breadcrumbs__link">Nodemailer</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# Nodemailer

</div>

**Send emails from Node.js - easy as cake!**

Nodemailer is the most popular email sending library for Node.js. It makes sending emails straightforward and secure, with zero runtime dependencies to manage.

<div class="language-bash codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockTitle_OeMC">

Install with npm

</div>

<div class="codeBlockContent_QJqH">

``` bash
npm install nodemailer
```

</div>

</div>

<div class="theme-admonition theme-admonition-tip admonition_xJq3 alert alert--success">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTIgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTYuNSAwQzMuNDggMCAxIDIuMTkgMSA1YzAgLjkyLjU1IDIuMjUgMSAzIDEuMzQgMi4yNSAxLjc4IDIuNzggMiA0djFoNXYtMWMuMjItMS4yMi42Ni0xLjc1IDItNCAuNDUtLjc1IDEtMi4wOCAxLTMgMC0yLjgxLTIuNDgtNS01LjUtNXptMy42NCA3LjQ4Yy0uMjUuNDQtLjQ3LjgtLjY3IDEuMTEtLjg2IDEuNDEtMS4yNSAyLjA2LTEuNDUgMy4yMy0uMDIuMDUtLjAyLjExLS4wMi4xN0g1YzAtLjA2IDAtLjEzLS4wMi0uMTctLjItMS4xNy0uNTktMS44My0xLjQ1LTMuMjMtLjItLjMxLS40Mi0uNjctLjY3LTEuMTFDMi40NCA2Ljc4IDIgNS42NSAyIDVjMC0yLjIgMi4wMi00IDQuNS00IDEuMjIgMCAyLjM2LjQyIDMuMjIgMS4xOUMxMC41NSAyLjk0IDExIDMuOTQgMTEgNWMwIC42Ni0uNDQgMS43OC0uODYgMi40OHpNNCAxNGg1Yy0uMjMgMS4xNC0xLjMgMi0yLjUgMnMtMi4yNy0uODYtMi41LTJ6IiAvPjwvc3ZnPg==)</span>Looking for a complete email gateway solution?

</div>

<div class="admonitionContent_BuS1">

<a href="https://emailengine.app/?utm_source=nodemailer&amp;utm_campaign=nodemailer&amp;utm_medium=tip-link" target="_blank" rel="noopener noreferrer"><strong>EmailEngine</strong></a> is a self-hosted email gateway that provides REST API access to IMAP and SMTP accounts, webhooks for mailbox changes, and advanced features like OAuth2, delayed delivery, open and click tracking, bounce detection, and more.

</div>

</div>

## Why Nodemailer?<a href="#why-nodemailer" class="hash-link" aria-label="Direct link to Why Nodemailer?" translate="no" title="Direct link to Why Nodemailer?">​</a>

- **Zero runtime dependencies** - everything you need is included in a single, well-maintained package.
- **Security focused** - designed to avoid remote code execution vulnerabilities that have affected other Node.js email libraries.
- **Full Unicode support** - send messages with any characters, including emoji.
- **Cross-platform** - works identically on Linux, macOS, and Windows with no native addons required (ideal for cloud environments like Azure).
- **HTML and plain-text emails** - send rich HTML emails with automatic plain-text fallbacks.
- **[Attachments](/message/attachments)** and **[embedded images](/message/embedded-images)** - easily include files and inline images in your messages.
- **Built-in TLS/STARTTLS encryption** - secure connections are handled automatically.
- **Multiple [transports](/transports)** - send via [SMTP](/smtp), [Sendmail](/transports/sendmail), [Amazon SES](/transports/ses), [streams](/transports/stream), and more.
- **[DKIM signing](/dkim)** and **[OAuth2 authentication](/smtp/oauth2)** - enterprise-ready email authentication.
- **[Proxy support](/smtp/proxies)** - route email through proxies for restricted network environments.
- **[Plugin API](/plugins)** - extend functionality with [custom plugins](/plugins/create) for advanced message processing.
- **<a href="https://ethereal.email" target="_blank" rel="noopener noreferrer">Ethereal.email</a> integration** - generate test accounts instantly for [local development and testing](/guides/testing-with-ethereal).

## Requirements<a href="#requirements" class="hash-link" aria-label="Direct link to Requirements" translate="no" title="Direct link to Requirements">​</a>

- **Node.js v6.0.0 or later** (examples using async/await require Node.js v8.0.0 or later).

No additional system libraries, services, or build tools are needed.

## Quick start<a href="#quick-start" class="hash-link" aria-label="Direct link to Quick start" translate="no" title="Direct link to Quick start">​</a>

Sending an email with Nodemailer involves three simple steps:

1.  **Create a transporter** - Configure your [SMTP server](/smtp) or another supported [transport method](/transports).
2.  **Compose your message** - Define the sender, recipient(s), subject, and [content](/message).
3.  **Send the email** - Call `transporter.sendMail()` with your message options.

## Create a transporter<a href="#create-a-transporter" class="hash-link" aria-label="Direct link to Create a transporter" translate="no" title="Direct link to Create a transporter">​</a>

A **transporter** is an object that handles the connection to your email service and sends messages on your behalf. You create one transporter and reuse it for all your emails.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const nodemailer = require("nodemailer");

// Create a transporter using SMTP
const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 587,
  secure: false, // use STARTTLS (upgrade connection to TLS after connecting)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
```

</div>

</div>

The `createTransport(transport[, defaults])` function returns a reusable transporter instance.

| Parameter | Type / Description |
|----|----|
| **transport** | **Object, String, or Plugin**. Pass a configuration object (as shown above), a connection URL (for example, `"smtp://user:pass@smtp.example.com:587"`), or an already-configured transport plugin. |
| **defaults** | *Object (optional)*. Default values that are automatically merged into every message sent through this transporter. Useful for setting a consistent `from` address or custom headers. |

<div class="theme-admonition theme-admonition-tip admonition_xJq3 alert alert--success">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTIgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTYuNSAwQzMuNDggMCAxIDIuMTkgMSA1YzAgLjkyLjU1IDIuMjUgMSAzIDEuMzQgMi4yNSAxLjc4IDIuNzggMiA0djFoNXYtMWMuMjItMS4yMi42Ni0xLjc1IDItNCAuNDUtLjc1IDEtMi4wOCAxLTMgMC0yLjgxLTIuNDgtNS01LjUtNXptMy42NCA3LjQ4Yy0uMjUuNDQtLjQ3LjgtLjY3IDEuMTEtLjg2IDEuNDEtMS4yNSAyLjA2LTEuNDUgMy4yMy0uMDIuMDUtLjAyLjExLS4wMi4xN0g1YzAtLjA2IDAtLjEzLS4wMi0uMTctLjItMS4xNy0uNTktMS44My0xLjQ1LTMuMjMtLjItLjMxLS40Mi0uNjctLjY3LTEuMTFDMi40NCA2Ljc4IDIgNS42NSAyIDVjMC0yLjIgMi4wMi00IDQuNS00IDEuMjIgMCAyLjM2LjQyIDMuMjIgMS4xOUMxMC41NSAyLjk0IDExIDMuOTQgMTEgNWMwIC42Ni0uNDQgMS43OC0uODYgMi40OHpNNCAxNGg1Yy0uMjMgMS4xNC0xLjMgMi0yLjUgMnMtMi4yNy0uODYtMi41LTJ6IiAvPjwvc3ZnPg==)</span>Reuse your transporter

</div>

<div class="admonitionContent_BuS1">

Create the transporter **once** when your application starts and reuse it for all emails. Creating a new transporter for each message wastes resources because each transporter opens network connections and may perform authentication.

</div>

</div>

### Other transport types<a href="#other-transport-types" class="hash-link" aria-label="Direct link to Other transport types" translate="no" title="Direct link to Other transport types">​</a>

- **SMTP** - see the [SMTP guide](/smtp) for the full list of configuration options.
- **SES** - send via Amazon Simple Email Service using the [SES transport](/transports/ses).
- **Sendmail** - pipe messages to the local sendmail binary using the [sendmail transport](/transports/sendmail).
- **Stream/JSON** - generate RFC 822 messages as streams or JSON for testing using the [stream transport](/transports/stream).
- **Plugins** - Nodemailer can send emails through any transport that implements the `send(mail, callback)` interface. See the [transport plugin documentation](/plugins/create#transports) for details.

## Verify the connection (optional)<a href="#verify-the-connection-optional" class="hash-link" aria-label="Direct link to Verify the connection (optional)" translate="no" title="Direct link to Verify the connection (optional)">​</a>

Before sending emails, you can verify that Nodemailer can connect to your SMTP server. This is useful for catching configuration errors early.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
try {
  await transporter.verify();
  console.log("Server is ready to take our messages");
} catch (err) {
  console.error("Verification failed:", err);
}
```

</div>

</div>

## Send a message<a href="#send-a-message" class="hash-link" aria-label="Direct link to Send a message" translate="no" title="Direct link to Send a message">​</a>

Once you have a transporter, send an email by calling `transporter.sendMail(message[, callback])`.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
try {
  const info = await transporter.sendMail({
    from: '"Example Team" <team@example.com>', // sender address
    to: "alice@example.com, bob@example.com", // list of recipients
    subject: "Hello", // subject line
    text: "Hello world?", // plain text body
    html: "<b>Hello world?</b>", // HTML body
  });

  console.log("Message sent: %s", info.messageId);
  // Preview URL is only available when using an Ethereal test account
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
} catch (err) {
  console.error("Error while sending mail:", err);
}
```

</div>

</div>

### Parameters<a href="#parameters" class="hash-link" aria-label="Direct link to Parameters" translate="no" title="Direct link to Parameters">​</a>

| Parameter | Description |
|----|----|
| **message** | An object containing the email content and headers. See [Message configuration](/message) for details. |
| **callback** | *(optional)* A function with signature `(err, info) => {}`. If omitted, `sendMail` returns a Promise. |

### Response object<a href="#response-object" class="hash-link" aria-label="Direct link to Response object" translate="no" title="Direct link to Response object">​</a>

The `info` object returned on success contains:

| Property | Description |
|----|----|
| `messageId` | The **Message-ID** header value assigned to the email. |
| `envelope` | An object containing the [SMTP envelope](/smtp/envelope) addresses (`from` and `to`). |
| `accepted` | An array of recipient addresses that the server accepted. |
| `rejected` | An array of recipient addresses that the server rejected. |
| `rejectedErrors` | An array of error objects for each rejected recipient, with details about the rejection reason. |
| `pending` | With the *direct* transport: addresses that received a temporary failure. |
| `response` | The final response string received from the SMTP server. |

<div class="theme-admonition theme-admonition-info admonition_xJq3 alert alert--info">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTQgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTcgMi4zYzMuMTQgMCA1LjcgMi41NiA1LjcgNS43cy0yLjU2IDUuNy01LjcgNS43QTUuNzEgNS43MSAwIDAgMSAxLjMgOGMwLTMuMTQgMi41Ni01LjcgNS43LTUuN3pNNyAxQzMuMTQgMSAwIDQuMTQgMCA4czMuMTQgNyA3IDcgNy0zLjE0IDctNy0zLjE0LTctNy03em0xIDNINnY1aDJWNHptMCA2SDZ2Mmgydi0yeiIgLz48L3N2Zz4=)</span>Partial success

</div>

<div class="admonitionContent_BuS1">

When a message has multiple recipients, it is considered **sent** as long as **at least one** recipient address was accepted by the server. Check the `rejected` array to see which addresses failed.

</div>

</div>

### Error handling<a href="#error-handling" class="hash-link" aria-label="Direct link to Error handling" translate="no" title="Direct link to Error handling">​</a>

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
try {
  const info = await transporter.sendMail(message);
  console.log("Message sent:", info.messageId);

  if (info.rejected.length > 0) {
    console.warn("Some recipients were rejected:", info.rejected);
  }
} catch (err) {
  switch (err.code) {
    case "ECONNECTION":
    case "ETIMEDOUT":
      console.error("Network error - retry later:", err.message);
      break;
    case "EAUTH":
      console.error("Authentication failed:", err.message);
      break;
    case "EENVELOPE":
      console.error("Invalid recipients:", err.rejected);
      break;
    default:
      console.error("Send failed:", err.message);
  }
}
```

</div>

</div>

See the [Error reference](/errors) for a complete list of error codes.

## Transporter events<a href="#transporter-events" class="hash-link" aria-label="Direct link to Transporter events" translate="no" title="Direct link to Transporter events">​</a>

The transporter emits events you can listen for:

| Event | Description |
|----|----|
| `idle` | Emitted when a [pooled](/smtp/pooled) transporter has capacity to accept more messages. |
| `error` | Emitted when a transport-level error occurs (for example, a connection failure). |
| `token` | Emitted when a new [OAuth2](/smtp/oauth2) access token is generated. Useful for persisting tokens. |

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
// Listen for OAuth2 token updates
transporter.on("token", (token) => {
  console.log("New access token for %s:", token.user, token.accessToken);
});
```

</div>

</div>

## Source and License<a href="#source-and-license" class="hash-link" aria-label="Direct link to Source and License" translate="no" title="Direct link to Source and License">​</a>

Nodemailer is open source software, licensed under the [MIT No Attribution (MIT-0)](/license) license. This means you can use it freely in any project without attribution requirements. Browse the source code on <a href="https://github.com/nodemailer/nodemailer" target="_blank" rel="noopener noreferrer">GitHub</a>.

------------------------------------------------------------------------

Made with love by <a href="https://github.com/andris9" target="_blank" rel="noopener noreferrer">Andris Reinman</a>. Logo by <a href="https://www.behance.net/kristjansen" target="_blank" rel="noopener noreferrer">Sven Kristjansen</a>.

</div>

<a href="/message" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

Message configuration

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#why-nodemailer" class="table-of-contents__link toc-highlight">Why Nodemailer?</a>
- <a href="#requirements" class="table-of-contents__link toc-highlight">Requirements</a>
- <a href="#quick-start" class="table-of-contents__link toc-highlight">Quick start</a>
- <a href="#create-a-transporter" class="table-of-contents__link toc-highlight">Create a transporter</a>
  - <a href="#other-transport-types" class="table-of-contents__link toc-highlight">Other transport types</a>
- <a href="#verify-the-connection-optional" class="table-of-contents__link toc-highlight">Verify the connection (optional)</a>
- <a href="#send-a-message" class="table-of-contents__link toc-highlight">Send a message</a>
  - <a href="#parameters" class="table-of-contents__link toc-highlight">Parameters</a>
  - <a href="#response-object" class="table-of-contents__link toc-highlight">Response object</a>
  - <a href="#error-handling" class="table-of-contents__link toc-highlight">Error handling</a>
- <a href="#transporter-events" class="table-of-contents__link toc-highlight">Transporter events</a>
- <a href="#source-and-license" class="table-of-contents__link toc-highlight">Source and License</a>

</div>

</div>

</div>

</div>

</div>
