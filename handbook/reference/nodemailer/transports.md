<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <span class="breadcrumbs__link">Transports</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# Transports

</div>

Nodemailer includes a fully-featured [SMTP transport](/smtp) that is enabled by default, but you are not limited to SMTP. A *transport* is the mechanism Nodemailer uses to deliver a fully-constructed email message. This could involve piping the message to the local `sendmail` binary, posting it to an HTTPS API like Amazon SES, or using any other delivery method you choose.

This page lists the transports bundled with Nodemailer as well as popular community-maintained transports. If none of these fit your needs, you can create your own by following the [transport API documentation](/plugins/create#transports).

------------------------------------------------------------------------

## Example: Amazon SES transport<a href="#example-amazon-ses-transport" class="hash-link" aria-label="Direct link to Example: Amazon SES transport" translate="no" title="Direct link to Example: Amazon SES transport">​</a>

The following example shows how to send email through <a href="https://aws.amazon.com/ses/" target="_blank" rel="noopener noreferrer">Amazon SES</a> using the built-in SES transport. This transport uses the official **AWS SDK v3** client to communicate with the SES API.

<div class="language-bash codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockTitle_OeMC">

Install dependencies

</div>

<div class="codeBlockContent_QJqH">

``` bash
npm install nodemailer @aws-sdk/client-sesv2
```

</div>

</div>

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockTitle_OeMC">

send-with-ses.js

</div>

<div class="codeBlockContent_QJqH">

``` javascript
const nodemailer = require("nodemailer");
const { SESv2Client, SendEmailCommand } = require("@aws-sdk/client-sesv2");

// Create an SES client. Configure your AWS credentials and region
// using environment variables, shared credentials file, or IAM roles.
const sesClient = new SESv2Client({});

// Create a Nodemailer transporter that uses the SES client.
// The property must be named "SES" (case-sensitive) and must include
// both the sesClient instance and the SendEmailCommand class.
const transporter = nodemailer.createTransport({
  SES: { sesClient, SendEmailCommand },
});

// Send an email using the standard Nodemailer sendMail interface
(async () => {
  await transporter.sendMail({
    from: "you@example.com",
    to: "friend@example.net",
    subject: "Hello from SES",
    text: "This message was sent with Nodemailer and Amazon SES!",
  });
})();
```

</div>

</div>

------------------------------------------------------------------------

## Available transports<a href="#available-transports" class="hash-link" aria-label="Direct link to Available transports" translate="no" title="Direct link to Available transports">​</a>

### Bundled (built-in) transports<a href="#bundled-built-in-transports" class="hash-link" aria-label="Direct link to Bundled (built-in) transports" translate="no" title="Direct link to Bundled (built-in) transports">​</a>

These transports are included with Nodemailer and require no additional packages.

| Transport | Purpose | Reference |
|----|----|----|
| **SMTP** | The default transport. Connects to an SMTP server to deliver messages. | [Docs](/smtp) |
| **sendmail** | Pipes the generated message to a local `sendmail`-compatible binary on your server. | [Docs](/transports/sendmail) |
| **SES** | Sends mail through the Amazon SES API using the AWS SDK v3. | [Docs](/transports/ses) |
| **stream** | Returns the generated RFC 5322 message as a stream instead of sending it. Useful for testing or custom processing. | [Docs](/transports/stream) |
| **JSON** | Returns a JSON representation of the message instead of sending it. Useful for debugging, storing messages, or passing to other systems. | [Docs](/transports/stream#json-transport) |

### Community transports<a href="#community-transports" class="hash-link" aria-label="Direct link to Community transports" translate="no" title="Direct link to Community transports">​</a>

These transports are maintained by the community in separate npm packages. Install them with `npm install` and pass their exported function to `nodemailer.createTransport()`.

- **Mailtrap** - Deliver messages to your Mailtrap inbox for safe email testing without sending to real recipients (<a href="https://github.com/railsware/mailtrap-nodejs#nodemailer-transport" target="_blank" rel="noopener noreferrer">npm</a>)
- **Mailgun** - Send email through Mailgun's HTTP API (<a href="https://www.npmjs.com/package/nodemailer-mailgun-transport" target="_blank" rel="noopener noreferrer">npm</a>)
- **Custom** - Build your own transport to implement business-specific logic. See [creating custom transports](/plugins/create#transports).

<div class="theme-admonition theme-admonition-note admonition_xJq3 alert alert--secondary">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTQgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTYuMyA1LjY5YS45NDIuOTQyIDAgMCAxLS4yOC0uN2MwLS4yOC4wOS0uNTIuMjgtLjcuMTktLjE4LjQyLS4yOC43LS4yOC4yOCAwIC41Mi4wOS43LjI4LjE4LjE5LjI4LjQyLjI4LjcgMCAuMjgtLjA5LjUyLS4yOC43YTEgMSAwIDAgMS0uNy4zYy0uMjggMC0uNTItLjExLS43LS4zek04IDcuOTljLS4wMi0uMjUtLjExLS40OC0uMzEtLjY5LS4yLS4xOS0uNDItLjMtLjY5LS4zMUg2Yy0uMjcuMDItLjQ4LjEzLS42OS4zMS0uMi4yLS4zLjQ0LS4zMS42OWgxdjNjLjAyLjI3LjExLjUuMzEuNjkuMi4yLjQyLjMxLjY5LjMxaDFjLjI3IDAgLjQ4LS4xMS42OS0uMzEuMi0uMTkuMy0uNDIuMzEtLjY5SDhWNy45OHYuMDF6TTcgMi4zYy0zLjE0IDAtNS43IDIuNTQtNS43IDUuNjggMCAzLjE0IDIuNTYgNS43IDUuNyA1LjdzNS43LTIuNTUgNS43LTUuN2MwLTMuMTUtMi41Ni01LjY5LTUuNy01LjY5di4wMXpNNyAuOThjMy44NiAwIDcgMy4xNCA3IDdzLTMuMTQgNy03IDctNy0zLjEyLTctNyAzLjE0LTcgNy03eiIgLz48L3N2Zz4=)</span>note

</div>

<div class="admonitionContent_BuS1">

Third-party transports are not maintained by the Nodemailer team. Check each project's README for installation instructions and usage details.

</div>

</div>

------------------------------------------------------------------------

## Transport-agnostic options<a href="#transport-agnostic-options" class="hash-link" aria-label="Direct link to Transport-agnostic options" translate="no" title="Direct link to Transport-agnostic options">​</a>

While each transport has its own configuration options, the following options work with **all** transports. Set these options on the configuration object you pass to `createTransport()`.

| Option | Type | Description |
|----|----|----|
| `attachDataUrls` | `Boolean` | When set to `true`, Nodemailer automatically converts inline `data:` URIs found in HTML content into embedded attachments. This is useful when your HTML contains base64-encoded images. |
| `disableFileAccess` | `Boolean` | When set to `true`, prevents Nodemailer from reading files from the filesystem when resolving attachments or HTML images. Enable this option when processing untrusted message content for security. |
| `disableUrlAccess` | `Boolean` | When set to `true`, prevents Nodemailer from making HTTP/HTTPS requests when resolving attachments or HTML images referenced by URL. Enable this option when processing untrusted message content for security. |
| `normalizeHeaderKey(key)` | `Function` | A callback function invoked for each header key before the header is added to the generated RFC 5322 message. Use this to customize header formatting. <a href="https://github.com/nodemailer/nodemailer/blob/3e3ba4f30ad5a73f037f45d3e36a9361ca43a318/examples/custom-headers.js#L13-L14" target="_blank" rel="noopener noreferrer">Example</a> |

</div>

<a href="/smtp/customauth" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

Custom authentication

</div>

<a href="/transports/ses" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

SES transport

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#example-amazon-ses-transport" class="table-of-contents__link toc-highlight">Example: Amazon SES transport</a>
- <a href="#available-transports" class="table-of-contents__link toc-highlight">Available transports</a>
  - <a href="#bundled-built-in-transports" class="table-of-contents__link toc-highlight">Bundled (built-in) transports</a>
  - <a href="#community-transports" class="table-of-contents__link toc-highlight">Community transports</a>
- <a href="#transport-agnostic-options" class="table-of-contents__link toc-highlight">Transport-agnostic options</a>

</div>

</div>

</div>

</div>

</div>
