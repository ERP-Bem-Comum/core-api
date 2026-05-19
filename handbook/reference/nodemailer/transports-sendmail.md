<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <a href="/transports" class="breadcrumbs__link"><span>Transports</span></a>
- <span class="breadcrumbs__link">Sendmail transport</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# Sendmail transport

</div>

The **Sendmail transport** delivers email by passing the generated RFC 822 message to the local **sendmail** command (or a compatible mail transfer agent such as Postfix or Exim). The message is piped directly to the program's standard input. This is the same mechanism used by PHP's `mail()` function.

## Usage<a href="#usage" class="hash-link" aria-label="Direct link to Usage" translate="no" title="Direct link to Usage">​</a>

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
// CommonJS
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  sendmail: true, // enable Sendmail transport
});
```

</div>

</div>

Setting `sendmail: true` activates the Sendmail transport. Nodemailer looks for a `sendmail` executable in your system's `PATH` by default. If your sendmail binary is located elsewhere, you can specify the full path using the `path` option described below.

### Transport options<a href="#transport-options" class="hash-link" aria-label="Direct link to Transport options" translate="no" title="Direct link to Transport options">​</a>

| Option | Type | Default | Description |
|----|----|----|----|
| `path` | `String` | `'sendmail'` | Path to the **sendmail** binary. Can be an absolute path (e.g., `/usr/sbin/sendmail`) or just the executable name if it is in your `PATH`. |
| `newline` | `'unix'` / `'windows'` | `'unix'` | Line ending style for the generated message. Use `'unix'` for `\n` (LF) or `'windows'` for `\r\n` (CRLF). Most systems work fine with the default `'unix'` setting. |
| `args` | `String[]` | *none* | Custom command-line arguments for the sendmail binary. When you provide this array, it replaces Nodemailer's default arguments **except** for `-i` (which is always included) and the recipient addresses (which are always appended). See the examples below for common use cases. |

When no custom `args` array is provided, Nodemailer executes the following command:

<div class="language-sh codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` sh
sendmail -i -f <from> <to...>
```

</div>

</div>

When you provide a custom `args` array, the command becomes:

<div class="language-sh codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` sh
sendmail -i <args...> <to...>
```

</div>

</div>

Note that the `-i` flag (which prevents a single dot on a line from being treated as the end of the message) and the recipient list are always included automatically.

### Response<a href="#response" class="hash-link" aria-label="Direct link to Response" translate="no" title="Direct link to Response">​</a>

After successfully sending a message, `transporter.sendMail()` resolves with an `info` object containing the following properties:

- `envelope` - An object with `from` (string) and `to` (array of strings) properties representing the message [envelope](/smtp/envelope)
- `messageId` - The generated Message-ID header value for the sent message
- `response` - The string `'Messages queued for delivery'`

Note that the sendmail command does not produce output, so the `response` is a static confirmation message from Nodemailer.

### Troubleshooting<a href="#troubleshooting" class="hash-link" aria-label="Direct link to Troubleshooting" translate="no" title="Direct link to Troubleshooting">​</a>

If Nodemailer cannot find the sendmail binary, you will receive an error with exit code 127. To resolve this:

1.  Verify that sendmail (or a compatible MTA like Postfix) is installed on your system
2.  Check that the binary is accessible via your `PATH`, or specify the full path using the `path` option
3.  Common locations include `/usr/sbin/sendmail` and `/usr/lib/sendmail`

For installation instructions, consult your operating system's documentation or the <a href="https://www.computerhope.com/unix/usendmai.htm" target="_blank" rel="noopener noreferrer">Computer Hope sendmail reference</a>.

### Examples<a href="#examples" class="hash-link" aria-label="Direct link to Examples" translate="no" title="Direct link to Examples">​</a>

#### Specifying a custom binary path<a href="#specifying-a-custom-binary-path" class="hash-link" aria-label="Direct link to Specifying a custom binary path" translate="no" title="Direct link to Specifying a custom binary path">​</a>

Use the `path` option when the sendmail binary is not in your `PATH` or you want to use a specific location:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  sendmail: true,
  newline: "unix",
  path: "/usr/sbin/sendmail",
});

transporter.sendMail(
  {
    from: "sender@example.com",
    to: "recipient@example.com",
    subject: "Test message",
    text: "I hope this message gets delivered!",
  },
  (err, info) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(info.envelope);
    console.log(info.messageId);
  }
);
```

</div>

</div>

#### Passing custom command-line arguments<a href="#passing-custom-command-line-arguments" class="hash-link" aria-label="Direct link to Passing custom command-line arguments" translate="no" title="Direct link to Passing custom command-line arguments">​</a>

Use the `args` option to pass additional flags to the sendmail binary. For example, to override the [envelope](/smtp/envelope) sender address (useful for setting a custom bounce address):

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const transporter = nodemailer.createTransport({
  sendmail: true,
  args: ["-f", "bounce@example.com"],
});
```

</div>

</div>

When using `args`, remember that you are replacing Nodemailer's default arguments. If you need the `-f` flag for the envelope sender, you must include it explicitly as shown above.

</div>

<a href="/transports/ses" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

SES transport

</div>

<a href="/transports/stream" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

Stream transport

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#usage" class="table-of-contents__link toc-highlight">Usage</a>
  - <a href="#transport-options" class="table-of-contents__link toc-highlight">Transport options</a>
  - <a href="#response" class="table-of-contents__link toc-highlight">Response</a>
  - <a href="#troubleshooting" class="table-of-contents__link toc-highlight">Troubleshooting</a>
  - <a href="#examples" class="table-of-contents__link toc-highlight">Examples</a>

</div>

</div>

</div>

</div>

</div>
