<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <a href="/transports" class="breadcrumbs__link"><span>Transports</span></a>
- <span class="breadcrumbs__link">Stream transport</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# Stream transport

</div>

Stream transport is **not** a real SMTP transport. Instead of delivering your message to a remote mail server, it *generates* the complete RFC 822 formatted email and returns it to you. This makes it ideal for:

- **[Testing](/guides/testing-with-ethereal)** - Examine the exact bytes that would be sent over the wire, create snapshot tests, or forward the output to another system for validation.
- **Custom delivery pipelines** - Apply Nodemailer plugins (such as DKIM signing or list headers) to your message, then handle delivery yourself through an internal API, archive messages for audit logging, or process them in any custom way.

For an overview of all available transports, see the [transports documentation](/transports).

------------------------------------------------------------------------

## Enabling Stream transport<a href="#enabling-stream-transport" class="hash-link" aria-label="Direct link to Enabling Stream transport" translate="no" title="Direct link to Enabling Stream transport">​</a>

To use Stream transport, create a transporter with `streamTransport: true` in the options object:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  streamTransport: true,
  // See additional options below
});
```

</div>

</div>

### Options<a href="#options" class="hash-link" aria-label="Direct link to Options" translate="no" title="Direct link to Options">​</a>

| Option | Type | Default | Description |
|----|----|----|----|
| `streamTransport` | `boolean` | **required** | Set to `true` to enable Stream transport. |
| `buffer` | `boolean` | `false` | When `true`, returns the generated message as a `Buffer` instead of a `Readable` stream. |
| `newline` | `'windows' | 'unix'` | `'unix'` | Line ending style for the generated message. Use `'windows'` for CRLF (`\r\n`) or `'unix'` for LF (`\n`). |

<div class="theme-admonition theme-admonition-note admonition_xJq3 alert alert--secondary">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTQgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTYuMyA1LjY5YS45NDIuOTQyIDAgMCAxLS4yOC0uN2MwLS4yOC4wOS0uNTIuMjgtLjcuMTktLjE4LjQyLS4yOC43LS4yOC4yOCAwIC41Mi4wOS43LjI4LjE4LjE5LjI4LjQyLjI4LjcgMCAuMjgtLjA5LjUyLS4yOC43YTEgMSAwIDAgMS0uNy4zYy0uMjggMC0uNTItLjExLS43LS4zek04IDcuOTljLS4wMi0uMjUtLjExLS40OC0uMzEtLjY5LS4yLS4xOS0uNDItLjMtLjY5LS4zMUg2Yy0uMjcuMDItLjQ4LjEzLS42OS4zMS0uMi4yLS4zLjQ0LS4zMS42OWgxdjNjLjAyLjI3LjExLjUuMzEuNjkuMi4yLjQyLjMxLjY5LjMxaDFjLjI3IDAgLjQ4LS4xMS42OS0uMzEuMi0uMTkuMy0uNDIuMzEtLjY5SDhWNy45OHYuMDF6TTcgMi4zYy0zLjE0IDAtNS43IDIuNTQtNS43IDUuNjggMCAzLjE0IDIuNTYgNS43IDUuNyA1LjdzNS43LTIuNTUgNS43LTUuN2MwLTMuMTUtMi41Ni01LjY5LTUuNy01LjY5di4wMXpNNyAuOThjMy44NiAwIDcgMy4xNCA3IDdzLTMuMTQgNy03IDctNy0zLjEyLTctNyAzLjE0LTcgNy03eiIgLz48L3N2Zz4=)</span>JSON Transport

</div>

<div class="admonitionContent_BuS1">

A separate **JSON transport** is also available. Enable it by setting `jsonTransport: true` (instead of `streamTransport`). JSON transport returns a serialized JSON representation of the message rather than the raw RFC 822 format. See the [JSON transport section](#json-transport) below for details.

</div>

</div>

### `sendMail()` callback signature<a href="#sendmail-callback-signature" class="hash-link" aria-label="Direct link to sendmail-callback-signature" translate="no" title="Direct link to sendmail-callback-signature">​</a>

The `sendMail()` callback receives two arguments: `(err, info)`. On success, the `info` object contains:

- **`envelope`** - The SMTP envelope object with `from` (string) and `to` (array of strings) properties.
- **`messageId`** - The generated *Message-ID* header value for this email.
- **`message`** - The generated email content. By default this is a Node.js `Readable` stream. If you set `buffer: true`, it will be a `Buffer`. For JSON transport, it will be a JSON string (or a plain object if `skipEncoding: true`).

For details on configuring the message object passed to `sendMail()`, see the [message configuration](/message) documentation. To parse the generated RFC 822 stream output, you can use [MailParser](/extras/mailparser).

------------------------------------------------------------------------

## Examples<a href="#examples" class="hash-link" aria-label="Direct link to Examples" translate="no" title="Direct link to Examples">​</a>

### 1. Stream a message with Windows-style line endings<a href="#1-stream-a-message-with-windows-style-line-endings" class="hash-link" aria-label="Direct link to 1. Stream a message with Windows-style line endings" translate="no" title="Direct link to 1. Stream a message with Windows-style line endings">​</a>

This example generates an email as a readable stream using Windows-style CRLF line endings. The stream can be piped to any writable destination.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  streamTransport: true,
  newline: "windows", // Use CRLF (\r\n) line endings
});

transporter.sendMail(
  {
    from: "sender@example.com",
    to: "recipient@example.com",
    subject: "Streamed message",
    text: "This message is streamed using CRLF line endings.",
  },
  (err, info) => {
    if (err) throw err;
    console.log(info.envelope);   // { from: '...', to: ['...'] }
    console.log(info.messageId);  // '<unique-id@example.com>'
    // Pipe the raw RFC 822 message to stdout
    info.message.pipe(process.stdout);
  }
);
```

</div>

</div>

### 2. Return a Buffer with Unix-style line endings<a href="#2-return-a-buffer-with-unix-style-line-endings" class="hash-link" aria-label="Direct link to 2. Return a Buffer with Unix-style line endings" translate="no" title="Direct link to 2. Return a Buffer with Unix-style line endings">​</a>

When you need the entire message in memory at once, set `buffer: true`. This example also explicitly uses Unix-style LF line endings (the default).

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  streamTransport: true,
  buffer: true,    // Return a Buffer instead of a stream
  newline: "unix", // Use LF (\n) line endings (this is the default)
});

transporter.sendMail(
  {
    from: "sender@example.com",
    to: "recipient@example.com",
    subject: "Buffered message",
    text: "This message is buffered using LF line endings.",
  },
  (err, info) => {
    if (err) throw err;
    console.log(info.envelope);
    console.log(info.messageId);
    // The complete message is available as a Buffer
    console.log(info.message.toString());
  }
);
```

</div>

</div>

### 3. Generate a JSON-encoded message object (\>= v3.1.0)<a href="#json-transport" class="hash-link" aria-label="Direct link to 3. Generate a JSON-encoded message object (&gt;= v3.1.0)" translate="no" title="Direct link to 3. Generate a JSON-encoded message object (&gt;= v3.1.0)">​</a>

**JSON transport** is a separate transport type, not an option of Stream transport. To use it, set `jsonTransport: true` instead of `streamTransport`. The resulting `info.message` will be a JSON string representing the message structure. This format is useful for storing messages, inspecting them in tests, or passing them to other systems. Binary data such as attachments is automatically base64-encoded.

If you prefer to work with a JavaScript object rather than a JSON string, set `skipEncoding: true` to receive the raw data object directly.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  jsonTransport: true,
});

transporter.sendMail(
  {
    from: "sender@example.com",
    to: "recipient@example.com",
    subject: "JSON message",
    text: "I hope this message gets JSON-ified!",
  },
  (err, info) => {
    if (err) throw err;
    console.log(info.envelope);
    console.log(info.messageId);
    console.log(info.message); // JSON string
  }
);
```

</div>

</div>

Here is an example of what the JSON output looks like:

<div class="language-json codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` json
{
  "from": { "address": "sender@example.com", "name": "" },
  "to": [{ "address": "recipient@example.com", "name": "" }],
  "subject": "JSON message",
  "text": "I hope this message gets JSON-ified!",
  "headers": {},
  "messageId": "<77a3458f-8070-339d-095f-85bb73f3db8e@example.com>"
}
```

</div>

</div>

------------------------------------------------------------------------

## When to choose Stream vs. JSON transport<a href="#when-to-choose-stream-vs-json-transport" class="hash-link" aria-label="Direct link to When to choose Stream vs. JSON transport" translate="no" title="Direct link to When to choose Stream vs. JSON transport">​</a>

Use the following table to help decide which transport best fits your needs:

| Use case | Recommended transport |
|----|----|
| Inspect or pipe raw RFC 822 SMTP content | `streamTransport` (Stream or Buffer) |
| Store structured message data for later replay | `jsonTransport` |
| Apply Nodemailer plugins (DKIM, headers, etc.) | Either (plugins run before output) |
| Need access to the `_raw` property (see [custom source](/message/custom-source)) | **Stream transport only** |

</div>

<a href="/transports/sendmail" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

Sendmail transport

</div>

<a href="/dkim" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

DKIM

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#enabling-stream-transport" class="table-of-contents__link toc-highlight">Enabling Stream transport</a>
  - <a href="#options" class="table-of-contents__link toc-highlight">Options</a>
  - <a href="#sendmail-callback-signature" class="table-of-contents__link toc-highlight"><code>sendMail()</code> callback signature</a>
- <a href="#examples" class="table-of-contents__link toc-highlight">Examples</a>
  - <a href="#1-stream-a-message-with-windows-style-line-endings" class="table-of-contents__link toc-highlight">1. Stream a message with Windows-style line endings</a>
  - <a href="#2-return-a-buffer-with-unix-style-line-endings" class="table-of-contents__link toc-highlight">2. Return a Buffer with Unix-style line endings</a>
  - <a href="#json-transport" class="table-of-contents__link toc-highlight">3. Generate a JSON-encoded message object (&gt;= v3.1.0)</a>
- <a href="#when-to-choose-stream-vs-json-transport" class="table-of-contents__link toc-highlight">When to choose Stream vs. JSON transport</a>

</div>

</div>

</div>

</div>

</div>
