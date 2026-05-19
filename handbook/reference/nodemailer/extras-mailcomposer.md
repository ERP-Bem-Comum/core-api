<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <a href="/extras" class="breadcrumbs__link"><span>Extra modules</span></a>
- <span class="breadcrumbs__link">Mailcomposer</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# Mailcomposer

</div>

Generate RFC 822-formatted email messages that you can stream directly to an SMTP connection or save to disk for later use. This is the inverse of [MailParser](/extras/mailparser), which parses raw messages back into structured objects.

<div class="theme-admonition theme-admonition-info admonition_xJq3 alert alert--info">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTQgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTcgMi4zYzMuMTQgMCA1LjcgMi41NiA1LjcgNS43cy0yLjU2IDUuNy01LjcgNS43QTUuNzEgNS43MSAwIDAgMSAxLjMgOGMwLTMuMTQgMi41Ni01LjcgNS43LTUuN3pNNyAxQzMuMTQgMSAwIDQuMTQgMCA4czMuMTQgNyA3IDcgNy0zLjE0IDctNy0zLjE0LTctNy03em0xIDNINnY1aDJWNHptMCA2SDZ2Mmgydi0yeiIgLz48L3N2Zz4=)</span>info

</div>

<div class="admonitionContent_BuS1">

Mailcomposer is included with Nodemailer. There is no separate package to install.

</div>

</div>

## Usage<a href="#usage" class="hash-link" aria-label="Direct link to Usage" translate="no" title="Direct link to Usage">​</a>

### 1. Install Nodemailer<a href="#1-install-nodemailer" class="hash-link" aria-label="Direct link to 1. Install Nodemailer" translate="no" title="Direct link to 1. Install Nodemailer">​</a>

<div class="language-bash codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` bash
npm install nodemailer
```

</div>

</div>

### 2. Import MailComposer in your code<a href="#2-import-mailcomposer-in-your-code" class="hash-link" aria-label="Direct link to 2. Import MailComposer in your code" translate="no" title="Direct link to 2. Import MailComposer in your code">​</a>

<div class="language-js codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` js
const MailComposer = require("nodemailer/lib/mail-composer");
```

</div>

</div>

### 3. Create a MailComposer instance<a href="#3-create-a-mailcomposer-instance" class="hash-link" aria-label="Direct link to 3. Create a MailComposer instance" translate="no" title="Direct link to 3. Create a MailComposer instance">​</a>

<div class="language-js codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` js
const mail = new MailComposer(mailOptions);
```

</div>

</div>

The `mailOptions` parameter is an object that defines your email message. See the complete list of available options in the [Message fields](#message-fields) section below.

------------------------------------------------------------------------

## API<a href="#api" class="hash-link" aria-label="Direct link to API" translate="no" title="Direct link to API">​</a>

### `createReadStream()`<a href="#createreadstream" class="hash-link" aria-label="Direct link to createreadstream" translate="no" title="Direct link to createreadstream">​</a>

Returns a readable stream that emits the raw RFC 822 message. This is useful when you want to pipe the message directly to another stream without loading the entire message into memory.

<div class="language-js codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` js
const mail = new MailComposer({ from: "you@example.com" /* ... */ });

const stream = mail.compile().createReadStream();
stream.pipe(process.stdout);
```

</div>

</div>

### `build(callback)`<a href="#buildcallback" class="hash-link" aria-label="Direct link to buildcallback" translate="no" title="Direct link to buildcallback">​</a>

Generates the complete message and returns it as a `Buffer` through a callback function. Use this method when you need the entire message in memory, for example to save it to a file or send it via an API.

<div class="language-js codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` js
const mail = new MailComposer({ from: "you@example.com" /* ... */ });

mail.compile().build((err, message) => {
  if (err) throw err;
  process.stdout.write(message);
});
```

</div>

</div>

------------------------------------------------------------------------

## Message fields<a href="#message-fields" class="hash-link" aria-label="Direct link to Message fields" translate="no" title="Direct link to Message fields">​</a>

MailComposer accepts the same message options as Nodemailer's [message configuration](/message). The table below summarizes the most commonly used fields.

| Field | Description |
|----|----|
| **from** | The sender's email address. You can use a plain address (`'sender@server.com'`) or include a display name (`'Sender Name <sender@server.com>'`). See [Address formatting](#address-formatting) for all supported formats. |
| **sender** | The email address that appears in the *Sender:* header. Use this when the person sending the message differs from the author listed in *From:*. |
| **to** | Primary recipients. Accepts a comma-separated string or an array of addresses. |
| **cc** | Carbon-copy recipients. These addresses receive a copy of the message and are visible to all recipients. |
| **bcc** | Blind carbon-copy recipients. These addresses receive a copy but are hidden from other recipients. See [BCC](#bcc) for information about header visibility. |
| **replyTo** | The address where replies should be sent. This populates the *Reply-To:* header. |
| **inReplyTo** | The `Message-ID` of the email this message is replying to. Used by email clients to thread conversations. |
| **references** | A list of related `Message-ID` values for conversation threading. Accepts a space-separated string or an array. |
| **subject** | The subject line of the message. |
| **text** | The plain-text version of the message body. Accepts a `string`, `Buffer`, `Stream`, or an object like `{ path: '/path/to/file.txt' }`. |
| **html** | The HTML version of the message body. Accepts the same input formats as **text**. |
| **watchHtml** | HTML content specifically for Apple Watch. Most modern smartwatches now render standard `text/html`, so this field is rarely needed. |
| **amp** | AMP4EMAIL content for interactive emails. Must be a complete, valid AMP document. Email clients that cannot render AMP will display the **html** version instead. <a href="https://blog.nodemailer.com/2019/12/30/testing-amp4email-with-nodemailer/" target="_blank" rel="noopener noreferrer">Learn more about AMP emails</a>. |
| **icalEvent** | An iCalendar event to include with the message. Accepts the same input formats as **text**/**html**. To specify the calendar method, use an object: `{ method: 'REQUEST', content: icsString }`. The default method is `PUBLISH`. Content must be UTF-8 encoded. |
| **headers** | Additional email headers. Accepts an object (`{ 'X-Custom-Header': 'value' }`) or an array (`[{ key: 'X-Custom-Header', value: 'value' }]`). |
| **attachments** | An array of files to attach to the message. See [Attachments](#attachments) below, or the main [attachments documentation](/message/attachments) for additional examples. |
| **alternatives** | An array of alternative content versions to include in a `multipart/alternative` section. See [Alternatives](#alternatives) for details. |
| **envelope** | A custom SMTP envelope that overrides the addresses derived from headers. See [SMTP envelope](#smtp-envelope). |
| **messageId** | A custom `Message-ID` value. If omitted, one is generated automatically. |
| **date** | A custom date for the `Date` header. Defaults to the current UTC time. |
| **encoding** | The transfer encoding to use for text parts (such as `quoted-printable` or `base64`). |
| **raw** | Provide a pre-built raw message instead of having MailComposer generate one. When using this option, you must set headers and envelope manually. See [custom source](/message/custom-source) for more details. |
| **textEncoding** | Force a specific encoding for text parts: `quoted-printable` or `base64`. If omitted, the encoding is detected automatically based on the content. |
| **disableUrlAccess** | When set to `true`, MailComposer will throw an error if any part of the message tries to fetch content from a URL. |
| **disableFileAccess** | When set to `true`, MailComposer will throw an error if any part of the message tries to read content from the file system. |
| **newline** | The line break style to use in the generated message. Valid values are `\r\n` (CRLF), `\n` (LF), or leave undefined to preserve the line breaks from your input. |

All text content is treated as UTF-8. Attachments are streamed as binary data.

------------------------------------------------------------------------

## Attachments<a href="#attachments" class="hash-link" aria-label="Direct link to Attachments" translate="no" title="Direct link to Attachments">​</a>

Each attachment is defined as an object with the following properties:

| Property | Description |
|----|----|
| **filename** | The file name shown to recipients. Unicode characters are allowed. Set to `false` to omit the filename entirely. |
| **cid** | A Content-ID for embedding the attachment inline (used with `cid:` URLs in HTML). When you set **cid**, the attachment automatically uses `contentDisposition: 'inline'` and is placed in the `multipart/related` section. |
| **content** | The attachment data as a `string`, `Buffer`, or readable `Stream`. |
| **encoding** | The encoding used to convert a string **content** into a Buffer. Common values include `base64` and `hex`. |
| **path** | A file path or URL to stream content from, instead of providing data directly via **content**. Supports local file paths, HTTP/HTTPS URLs, and data URIs. Ideal for large files. |
| **contentType** | The MIME type of the attachment. If omitted, it is detected automatically from the **filename** or **path**. |
| **contentTransferEncoding** | The transfer encoding for this attachment (`quoted-printable`, `base64`, etc.). If omitted, it is detected automatically. |
| **contentDisposition** | How the attachment should be presented: `attachment` (the default, shown as a downloadable file) or `inline` (displayed within the message body). |
| **headers** | Additional headers for this MIME part, for example: `{ 'X-Custom-Header': 'value' }`. |
| **raw** | Provide pre-built raw MIME content for this part. When set, all other attachment options are ignored. Accepts a `string`, `Buffer`, `Stream`, or another attachment-like object. |

### Example<a href="#example" class="hash-link" aria-label="Direct link to Example" translate="no" title="Direct link to Example">​</a>

<div class="language-js codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` js
const fs = require("fs");

const mailOptions = {
  // ...other fields...
  attachments: [
    // Plain text string as attachment content
    { filename: "hello.txt", content: "hello world!" },

    // Binary Buffer as attachment content
    { filename: "buffer.txt", content: Buffer.from("hello world!", "utf-8") },

    // Stream content from a file on disk
    { filename: "file.txt", path: "/path/to/file.txt" },

    // Let filename and content type be inferred from the path
    { path: "/path/to/logo.png" },

    // Use a readable stream as the content source
    { filename: "stream.txt", content: fs.createReadStream("file.txt") },

    // Explicitly set the content type
    { filename: "data.bin", content: "hello world!", contentType: "application/octet-stream" },

    // Fetch attachment content from a remote URL
    { filename: "license.txt", path: "https://raw.githubusercontent.com/nodemailer/nodemailer/master/LICENSE" },

    // Decode a base64-encoded string into attachment content
    { filename: "base64.txt", content: "aGVsbG8gd29ybGQh", encoding: "base64" },

    // Use a data URI as the content source
    { path: "data:text/plain;base64,aGVsbG8gd29ybGQ=" },
  ],
};
```

</div>

</div>

------------------------------------------------------------------------

## Alternatives<a href="#alternatives" class="hash-link" aria-label="Direct link to Alternatives" translate="no" title="Direct link to Alternatives">​</a>

In addition to **text** and **html**, you can include other versions of your message content as *alternatives*. For example, you might include a Markdown version or an OpenDocument version of the same content. The recipient's email client will choose the most appropriate version to display.

Alternative objects use the same properties as [attachments](#attachments), but they are placed in the `multipart/alternative` section of the message rather than the `multipart/mixed` or `multipart/related` sections.

<div class="language-js codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` js
const mailOptions = {
  html: "<b>Hello world!</b>",
  alternatives: [
    {
      contentType: "text/x-web-markdown",
      content: "**Hello world!**",
    },
  ],
};
```

</div>

</div>

------------------------------------------------------------------------

## Address formatting<a href="#address-formatting" class="hash-link" aria-label="Direct link to Address formatting" translate="no" title="Direct link to Address formatting">​</a>

Email addresses can be specified in several formats:

**As a string:**

<div class="language-text codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` text
recipient@example.com
"Display Name" <recipient@example.com>
```

</div>

</div>

**As an object** (useful when the display name contains special characters):

<div class="language-js codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` js
{
  name: 'Display Name',
  address: 'recipient@example.com'
}
```

</div>

</div>

All address fields (including **from**) accept one or more addresses. You can mix and match formats freely:

<div class="language-js codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` js
{
  to: 'user1@example.com, "User Two" <user2@example.com>',
  cc: [
    'user3@example.com',
    '"User Four" <user4@example.com>',
    { name: 'User Five', address: 'user5@example.com' }
  ]
}
```

</div>

</div>

Internationalized domain names (IDN) are automatically converted to their ASCII-compatible encoding (punycode):

<div class="language-text codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` text
"Андрис" <андрис@уайлддак.орг>
// Domain converts to punycode: андрис@xn--80aalaxjd5d.xn--c1avg
```

</div>

</div>

Note that email addresses with non-ASCII usernames (the part before `@`) require the receiving server to support the SMTPUTF8 extension.

------------------------------------------------------------------------

## SMTP envelope<a href="#smtp-envelope" class="hash-link" aria-label="Direct link to SMTP envelope" translate="no" title="Direct link to SMTP envelope">​</a>

By default, the SMTP envelope (the actual routing information used by mail servers) is derived from the address headers in your message. If you need different envelope addresses - for example, to implement VERP (Variable Envelope Return Path) or to use a null return path - you can specify them explicitly:

<div class="language-js codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` js
const mailOptions = {
  from: "mailer@example.com",
  to: "daemon@example.com",
  envelope: {
    from: "Daemon <daemon@example.com>",
    to: 'mailer@example.com, "Mailer Two" <mailer2@example.com>',
  },
};
```

</div>

</div>

<div class="theme-admonition theme-admonition-note admonition_xJq3 alert alert--secondary">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTQgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTYuMyA1LjY5YS45NDIuOTQyIDAgMCAxLS4yOC0uN2MwLS4yOC4wOS0uNTIuMjgtLjcuMTktLjE4LjQyLS4yOC43LS4yOC4yOCAwIC41Mi4wOS43LjI4LjE4LjE5LjI4LjQyLjI4LjcgMCAuMjgtLjA5LjUyLS4yOC43YTEgMSAwIDAgMS0uNy4zYy0uMjggMC0uNTItLjExLS43LS4zek04IDcuOTljLS4wMi0uMjUtLjExLS40OC0uMzEtLjY5LS4yLS4xOS0uNDItLjMtLjY5LS4zMUg2Yy0uMjcuMDItLjQ4LjEzLS42OS4zMS0uMi4yLS4zLjQ0LS4zMS42OWgxdjNjLjAyLjI3LjExLjUuMzEuNjkuMi4yLjQyLjMxLjY5LjMxaDFjLjI3IDAgLjQ4LS4xMS42OS0uMzEuMi0uMTkuMy0uNDIuMzEtLjY5SDhWNy45OHYuMDF6TTcgMi4zYy0zLjE0IDAtNS43IDIuNTQtNS43IDUuNjggMCAzLjE0IDIuNTYgNS43IDUuNyA1LjdzNS43LTIuNTUgNS43LTUuN2MwLTMuMTUtMi41Ni01LjY5LTUuNy01LjY5di4wMXpNNyAuOThjMy44NiAwIDcgMy4xNCA3IDdzLTMuMTQgNy03IDctNy0zLjEyLTctNyAzLjE0LTcgNy03eiIgLz48L3N2Zz4=)</span>note

</div>

<div class="admonitionContent_BuS1">

Some transports (such as AWS SES) ignore the `envelope` option and use the header addresses instead.

</div>

</div>

------------------------------------------------------------------------

## Using embedded images<a href="#using-embedded-images" class="hash-link" aria-label="Direct link to Using embedded images" translate="no" title="Direct link to Using embedded images">​</a>

To embed an image directly in your HTML content, assign a unique `cid` (Content-ID) to the attachment and reference it using the `cid:` protocol in your HTML:

<div class="language-js codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` js
const mailOptions = {
  html: 'Embedded image: <img src="cid:unique@nodemailer" />',
  attachments: [
    {
      filename: "image.png",
      path: "/path/to/image.png",
      cid: "unique@nodemailer", // This value must match the src attribute
    },
  ],
};
```

</div>

</div>

------------------------------------------------------------------------

## BCC<a href="#bcc" class="hash-link" aria-label="Direct link to BCC" translate="no" title="Direct link to BCC">​</a>

For privacy protection, MailComposer removes the *Bcc:* header from the generated message by default. This ensures that blind carbon-copy recipients remain hidden from other recipients.

If you need the *Bcc:* header to remain in the generated message (for example, when archiving messages), you can enable `keepBcc` on the compiled message object:

<div class="language-js codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` js
const mail = new MailComposer({
  // ...message options...
  bcc: "bcc@example.com",
}).compile();

mail.keepBcc = true;

mail.build((err, message) => {
  if (err) throw err;
  process.stdout.write(message);
});
```

</div>

</div>

------------------------------------------------------------------------

## License<a href="#license" class="hash-link" aria-label="Direct link to License" translate="no" title="Direct link to License">​</a>

<a href="https://github.com/nodemailer/nodemailer/blob/master/LICENSE" target="_blank" rel="noopener noreferrer">MIT</a>

</div>

<a href="/extras/mailparser" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

MailParser

</div>

<a href="/errors" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

Error reference

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#usage" class="table-of-contents__link toc-highlight">Usage</a>
  - <a href="#1-install-nodemailer" class="table-of-contents__link toc-highlight">1. Install Nodemailer</a>
  - <a href="#2-import-mailcomposer-in-your-code" class="table-of-contents__link toc-highlight">2. Import MailComposer in your code</a>
  - <a href="#3-create-a-mailcomposer-instance" class="table-of-contents__link toc-highlight">3. Create a MailComposer instance</a>
- <a href="#api" class="table-of-contents__link toc-highlight">API</a>
  - <a href="#createreadstream" class="table-of-contents__link toc-highlight"><code>createReadStream()</code></a>
  - <a href="#buildcallback" class="table-of-contents__link toc-highlight"><code>build(callback)</code></a>
- <a href="#message-fields" class="table-of-contents__link toc-highlight">Message fields</a>
- <a href="#attachments" class="table-of-contents__link toc-highlight">Attachments</a>
  - <a href="#example" class="table-of-contents__link toc-highlight">Example</a>
- <a href="#alternatives" class="table-of-contents__link toc-highlight">Alternatives</a>
- <a href="#address-formatting" class="table-of-contents__link toc-highlight">Address formatting</a>
- <a href="#smtp-envelope" class="table-of-contents__link toc-highlight">SMTP envelope</a>
- <a href="#using-embedded-images" class="table-of-contents__link toc-highlight">Using embedded images</a>
- <a href="#bcc" class="table-of-contents__link toc-highlight">BCC</a>
- <a href="#license" class="table-of-contents__link toc-highlight">License</a>

</div>

</div>

</div>

</div>

</div>
