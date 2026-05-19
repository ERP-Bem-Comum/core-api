<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <span class="breadcrumbs__link">DKIM</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# DKIM Signing

</div>

DomainKeys Identified Mail (DKIM) adds a cryptographic signature to every
outgoing message. This signature allows receiving mail servers to verify that
the message genuinely originates from **your** domain and has not been tampered
with during transit.

Nodemailer can sign messages with one or more DKIM keys **without** requiring
any additional dependencies. In most cases, signing is fast and handled entirely
in memory. For very large messages, you can optionally enable disk caching so
that only the first *cacheTreshold* bytes are stored in RAM.

------------------------------------------------------------------------

## Configuration<a href="#configuration" class="hash-link" aria-label="Direct link to Configuration" translate="no" title="Direct link to Configuration">​</a>

You can configure DKIM signing in two ways:

- **Transport-wide** - Every message sent through the transporter is
  automatically signed with the same key(s), **or**
- **Per-message** - Pass a `dkim` object in the [message configuration](/message) to override or
  replace the transport-level settings.

If you specify DKIM settings at both levels, the **message-level settings take
precedence**.

### DKIM options<a href="#dkim-options" class="hash-link" aria-label="Direct link to DKIM options" translate="no" title="Direct link to DKIM options">​</a>

| Option | Type | Default | Description |
|----|----|----|----|
| `domainName` | `string` (required) | \- | The domain name to sign for. This appears in the `d=` tag of the DKIM signature header. |
| `keySelector` | `string` (required) | \- | The DNS selector for your DKIM key. This forms part of the DNS TXT record lookup path: `<selector>._domainkey.<domain>`. |
| `privateKey` | `string | Buffer` (required) | \- | Your PEM-formatted private key. This must correspond to the public key published in your DNS TXT record. |
| `keys` | `Array< {domainName, keySelector, privateKey} >` | \- | An array of key objects for signing with multiple keys (useful for key rotation or signing for multiple subdomains). When set, the single-key fields above are ignored. |
| `hashAlgo` | `'sha256' | 'sha1'` | `'sha256'` | The hash algorithm used for the body hash. Use `sha256` unless you have a specific reason to use `sha1`. |
| `headerFieldNames` | `string` | RFC 4871 defaults | A colon-separated list of header field names to include in the signature (for example, `from:to:subject`). By default, Nodemailer signs the standard headers recommended by RFC 4871. |
| `skipFields` | `string` | \- | A colon-separated list of header field names to **exclude** from signing. Use this when your email service provider modifies certain headers after signing (for example, `message-id:date`). |
| `cacheDir` | `string | false` | `false` | A directory path for temporary files when processing large messages. Set to `false` to disable disk caching entirely. |
| `cacheTreshold` | `number` | `2097152` (2 MB) | The number of bytes to keep in memory before switching to disk caching. Only applies when `cacheDir` is set to a valid path. |

<div class="theme-admonition theme-admonition-warning admonition_xJq3 alert alert--warning">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTYgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTguODkzIDEuNWMtLjE4My0uMzEtLjUyLS41LS44ODctLjVzLS43MDMuMTktLjg4Ni41TC4xMzggMTMuNDk5YS45OC45OCAwIDAgMCAwIDEuMDAxYy4xOTMuMzEuNTMuNTAxLjg4Ni41MDFoMTMuOTY0Yy4zNjcgMCAuNzA0LS4xOS44NzctLjVhMS4wMyAxLjAzIDAgMCAwIC4wMS0xLjAwMkw4Ljg5MyAxLjV6bS4xMzMgMTEuNDk3SDYuOTg3di0yLjAwM2gyLjAzOXYyLjAwM3ptMC0zLjAwNEg2Ljk4N1Y1Ljk4N2gyLjAzOXY0LjAwNnoiIC8+PC9zdmc+)</span>warning

</div>

<div class="admonitionContent_BuS1">

The option `cacheTreshold` is intentionally misspelled (with an "o" instead of "e") to maintain backwards compatibility with older Nodemailer versions.

</div>

</div>

------------------------------------------------------------------------

## Usage examples<a href="#usage-examples" class="hash-link" aria-label="Direct link to Usage examples" translate="no" title="Direct link to Usage examples">​</a>

The following examples use CommonJS syntax and require **Node.js v6** or later:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const nodemailer = require("nodemailer");
const fs = require("fs");
```

</div>

</div>

### 1. Sign every message<a href="#1-sign-every-message" class="hash-link" aria-label="Direct link to 1. Sign every message" translate="no" title="Direct link to 1. Sign every message">​</a>

This example configures DKIM signing at the transport level, so all messages
sent through this transporter are automatically signed:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 465,
  secure: true,
  dkim: {
    domainName: "example.com",
    keySelector: "2017",
    privateKey: fs.readFileSync("./dkim-private.pem", "utf8"),
  },
});
```

</div>

</div>

To verify that your DNS record is correctly configured, run:

<div class="language-bash codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` bash
dig TXT 2017._domainkey.example.com
```

</div>

</div>

### 2. Sign with multiple keys<a href="#2-sign-with-multiple-keys" class="hash-link" aria-label="Direct link to 2. Sign with multiple keys" translate="no" title="Direct link to 2. Sign with multiple keys">​</a>

Use multiple keys when rotating DKIM keys or when sending mail on behalf of
different subdomains:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 465,
  secure: true,
  dkim: {
    keys: [
      {
        domainName: "example.com",
        keySelector: "2017",
        privateKey: fs.readFileSync("./dkim-2017.pem", "utf8"),
      },
      {
        domainName: "example.com",
        keySelector: "2016",
        privateKey: fs.readFileSync("./dkim-2016.pem", "utf8"),
      },
    ],
    cacheDir: false, // disable disk caching
  },
});
```

</div>

</div>

### 3. Sign a specific message only<a href="#3-sign-a-specific-message-only" class="hash-link" aria-label="Direct link to 3. Sign a specific message only" translate="no" title="Direct link to 3. Sign a specific message only">​</a>

If you do not want to sign all messages, you can configure DKIM on individual
messages instead:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 465,
  secure: true,
  // No DKIM configuration here
});

const info = await transporter.sendMail({
  from: "sender@example.com",
  to: "recipient@example.com",
  subject: "Hello with DKIM",
  text: "I hope this message gets read!",
  dkim: {
    domainName: "example.com",
    keySelector: "2017",
    privateKey: fs.readFileSync("./dkim-private.pem", "utf8"),
  },
});
```

</div>

</div>

### 4. Cache large messages on disk<a href="#4-cache-large-messages-on-disk" class="hash-link" aria-label="Direct link to 4. Cache large messages on disk" translate="no" title="Direct link to 4. Cache large messages on disk">​</a>

When sending messages with large attachments, you can reduce memory usage by
enabling disk caching. Nodemailer will store message content exceeding the
threshold in a temporary file:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 465,
  secure: true,
  dkim: {
    domainName: "example.com",
    keySelector: "2017",
    privateKey: fs.readFileSync("./dkim.pem", "utf8"),
    cacheDir: "/tmp",
    cacheTreshold: 100 * 1024, // 100 KB
  },
});
```

</div>

</div>

### 5. Skip mutable headers<a href="#5-skip-mutable-headers" class="hash-link" aria-label="Direct link to 5. Skip mutable headers" translate="no" title="Direct link to 5. Skip mutable headers">​</a>

Some email service providers, such as **[Amazon SES](/transports/ses)**, replace headers like
`Message-ID` and `Date` after you submit the message. If these headers are
included in the DKIM signature, the signature will fail verification. Use
`skipFields` to exclude them.

<div class="theme-admonition theme-admonition-tip admonition_xJq3 alert alert--success">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTIgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTYuNSAwQzMuNDggMCAxIDIuMTkgMSA1YzAgLjkyLjU1IDIuMjUgMSAzIDEuMzQgMi4yNSAxLjc4IDIuNzggMiA0djFoNXYtMWMuMjItMS4yMi42Ni0xLjc1IDItNCAuNDUtLjc1IDEtMi4wOCAxLTMgMC0yLjgxLTIuNDgtNS01LjUtNXptMy42NCA3LjQ4Yy0uMjUuNDQtLjQ3LjgtLjY3IDEuMTEtLjg2IDEuNDEtMS4yNSAyLjA2LTEuNDUgMy4yMy0uMDIuMDUtLjAyLjExLS4wMi4xN0g1YzAtLjA2IDAtLjEzLS4wMi0uMTctLjItMS4xNy0uNTktMS44My0xLjQ1LTMuMjMtLjItLjMxLS40Mi0uNjctLjY3LTEuMTFDMi40NCA2Ljc4IDIgNS42NSAyIDVjMC0yLjIgMi4wMi00IDQuNS00IDEuMjIgMCAyLjM2LjQyIDMuMjIgMS4xOUMxMC41NSAyLjk0IDExIDMuOTQgMTEgNWMwIC42Ni0uNDQgMS43OC0uODYgMi40OHpNNCAxNGg1Yy0uMjMgMS4xNC0xLjMgMi0yLjUgMnMtMi4yNy0uODYtMi41LTJ6IiAvPjwvc3ZnPg==)</span>tip

</div>

<div class="admonitionContent_BuS1">

When using the [SES transport](/transports/ses), Nodemailer automatically adds `date:message-id` to `skipFields` for you.

</div>

</div>

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 465,
  secure: true,
  dkim: {
    domainName: "example.com",
    keySelector: "2017",
    privateKey: fs.readFileSync("./dkim.pem", "utf8"),
    skipFields: "message-id:date",
  },
});
```

</div>

</div>

------------------------------------------------------------------------

## Troubleshooting<a href="#troubleshooting" class="hash-link" aria-label="Direct link to Troubleshooting" translate="no" title="Direct link to Troubleshooting">​</a>

- **Signature verification fails** - Confirm that your public key is published
  at `<keySelector>._domainkey.<domainName>` in DNS. Also check that the TXT
  record is **under 255 characters per string** (some DNS providers split or
  truncate long records incorrectly).
- **Header mismatch errors** - If a receiving server reports that signed headers
  do not match, add the problematic headers to `skipFields` or ensure your
  sending infrastructure does not modify headers after signing.
- **Need more help?** Test your DKIM configuration with online tools such as
  <a href="https://dkimvalidator.com" target="_blank" rel="noopener noreferrer">dkimvalidator.com</a> or
  <a href="https://www.mail-tester.com" target="_blank" rel="noopener noreferrer">mail-tester.com</a>. These services send a test
  email and provide detailed feedback about your DKIM setup.

</div>

<a href="/transports/stream" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

Stream transport

</div>

<a href="/guides" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

Guides

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#configuration" class="table-of-contents__link toc-highlight">Configuration</a>
  - <a href="#dkim-options" class="table-of-contents__link toc-highlight">DKIM options</a>
- <a href="#usage-examples" class="table-of-contents__link toc-highlight">Usage examples</a>
  - <a href="#1-sign-every-message" class="table-of-contents__link toc-highlight">1. Sign every message</a>
  - <a href="#2-sign-with-multiple-keys" class="table-of-contents__link toc-highlight">2. Sign with multiple keys</a>
  - <a href="#3-sign-a-specific-message-only" class="table-of-contents__link toc-highlight">3. Sign a specific message only</a>
  - <a href="#4-cache-large-messages-on-disk" class="table-of-contents__link toc-highlight">4. Cache large messages on disk</a>
  - <a href="#5-skip-mutable-headers" class="table-of-contents__link toc-highlight">5. Skip mutable headers</a>
- <a href="#troubleshooting" class="table-of-contents__link toc-highlight">Troubleshooting</a>

</div>

</div>

</div>

</div>

</div>
