<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <a href="/message" class="breadcrumbs__link"><span>Message configuration</span></a>
- <span class="breadcrumbs__link">Attachments</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# Attachments

</div>

To attach files to an email, use the `attachments` option of the [message object](/). The `attachments` option accepts an array of attachment objects, and you can include **as many files as you need**.

Each attachment object supports the following properties:

| Property | Type | Description |
|----|----|----|
| `filename` | `string` | The filename that will be shown to recipients. Unicode characters are supported. |
| `content` | `string | Buffer | Stream` | The attachment contents. Can be a string, a Buffer, or a readable stream. |
| `path` | `string` | A file path, URL, or data URI. Nodemailer streams the file directly instead of loading it entirely into memory, making this the recommended approach for large files. |
| `href` | `string` | An HTTP or HTTPS URL. Nodemailer will fetch the content from this URL and include it as an attachment. |
| `httpHeaders` | `object` | Custom HTTP headers to send when fetching content from `href`. For example: `{ authorization: 'Bearer token123' }`. |
| `contentType` | `string` | The <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types" target="_blank" rel="noopener noreferrer">MIME type</a> of the attachment. If not specified, Nodemailer will attempt to detect it from the `filename` or `path`. |
| `contentDisposition` | `string` | The Content-Disposition header value. Defaults to `'attachment'`. Use `'inline'` for embedded content like images referenced in HTML. |
| `cid` | `string` | A Content-ID value for referencing the attachment in HTML content. Use this with `<img src="cid:your-cid-value"/>` to [embed images inline](/message/embedded-images). |
| `encoding` | `string` | Specifies how to decode the `content` string. Common values include `'base64'`, `'hex'`, and `'utf8'`. |
| `contentTransferEncoding` | `string` | The Content-Transfer-Encoding header value. Supported values are `'base64'`, `'quoted-printable'`, `'7bit'`, and `'8bit'`. Defaults to `'base64'` for most attachments. |
| `headers` | `object` | Additional [custom headers](/message/custom-headers) to add to this specific attachment's MIME node. |
| `raw` | `string` | **Advanced**: A complete, pre-built MIME node including all headers. When specified, this overrides all other attachment properties. |

<div class="theme-admonition theme-admonition-tip admonition_xJq3 alert alert--success">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTIgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTYuNSAwQzMuNDggMCAxIDIuMTkgMSA1YzAgLjkyLjU1IDIuMjUgMSAzIDEuMzQgMi4yNSAxLjc4IDIuNzggMiA0djFoNXYtMWMuMjItMS4yMi42Ni0xLjc1IDItNCAuNDUtLjc1IDEtMi4wOCAxLTMgMC0yLjgxLTIuNDgtNS01LjUtNXptMy42NCA3LjQ4Yy0uMjUuNDQtLjQ3LjgtLjY3IDEuMTEtLjg2IDEuNDEtMS4yNSAyLjA2LTEuNDUgMy4yMy0uMDIuMDUtLjAyLjExLS4wMi4xN0g1YzAtLjA2IDAtLjEzLS4wMi0uMTctLjItMS4xNy0uNTktMS44My0xLjQ1LTMuMjMtLjItLjMxLS40Mi0uNjctLjY3LTEuMTFDMi40NCA2Ljc4IDIgNS42NSAyIDVjMC0yLjIgMi4wMi00IDQuNS00IDEuMjIgMCAyLjM2LjQyIDMuMjIgMS4xOUMxMC41NSAyLjk0IDExIDMuOTQgMTEgNWMwIC42Ni0uNDQgMS43OC0uODYgMi40OHpNNCAxNGg1Yy0uMjMgMS4xNC0xLjMgMi0yLjUgMnMtMi4yNy0uODYtMi41LTJ6IiAvPjwvc3ZnPg==)</span>Streaming vs. in-memory

</div>

<div class="admonitionContent_BuS1">

For large files, prefer using `path`, `href`, or a readable stream for the `content` property. This allows Nodemailer to stream the data incrementally rather than loading the entire file into memory at once.

</div>

</div>

## Examples<a href="#examples" class="hash-link" aria-label="Direct link to Examples" translate="no" title="Direct link to Examples">​</a>

The following examples demonstrate different ways to attach files to an email message.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const fs = require("fs");

// The attachments array goes inside your message object
attachments: [
  // 1. Plain text string
  // The simplest way to create an attachment from a string
  {
    filename: "hello.txt",
    content: "Hello world!",
  },

  // 2. Buffer content
  // Useful when you have binary data in memory
  {
    filename: "buffer.txt",
    content: Buffer.from("Hello world!", "utf8"),
  },

  // 3. File from the filesystem
  // Uses streaming, which is memory-efficient for large files
  {
    filename: "report.pdf",
    path: "/absolute/path/to/report.pdf",
  },

  // 4. File path only
  // When you omit filename, Nodemailer derives it from the path
  // The content type is also automatically detected from the file extension
  {
    path: "/absolute/path/to/image.png",
  },

  // 5. Readable stream
  // Provides full control over how content is read
  {
    filename: "notes.txt",
    content: fs.createReadStream("./notes.txt"),
  },

  // 6. Explicit content type
  // Override automatic MIME type detection when needed
  {
    filename: "data.bin",
    content: Buffer.from("deadbeef", "hex"),
    contentType: "application/octet-stream",
  },

  // 7. Remote URL
  // Nodemailer fetches the content from the URL when sending
  {
    filename: "license.txt",
    href: "https://raw.githubusercontent.com/nodemailer/nodemailer/master/LICENSE",
  },

  // 8. Base64-encoded string
  // Specify the encoding when your content string is not plain text
  {
    filename: "photo.jpg",
    content: "/9j/4AAQSkZJRgABAQAAAQABAAD...", // base64 image data (truncated)
    encoding: "base64",
  },

  // 9. Data URI
  // Useful for inline data or content from canvas elements
  {
    path: "data:text/plain;base64,SGVsbG8gd29ybGQ=",
  },

  // 10. Pre-built MIME node (advanced)
  // Provides complete control over the attachment's MIME structure
  {
    raw: [
      "Content-Type: text/plain; charset=utf-8",
      'Content-Disposition: attachment; filename="greeting.txt"',
      "",
      "Hello world!"
    ].join("\r\n"),
  },
];
```

</div>

</div>

## Embedding images<a href="#embedding-images" class="hash-link" aria-label="Direct link to Embedding images" translate="no" title="Direct link to Embedding images">​</a>

You can embed images directly in the HTML body of your email instead of displaying them as downloadable attachments. To do this, assign a Content-ID (`cid`) to the attachment and reference it in your HTML using the `cid:` URL scheme. For more details and examples, see the [embedded images](/message/embedded-images) page.

The `cid` value can be any unique string. A common convention is to use an email-like format (for example, `logo@nodemailer`), but this is not required.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
{
  attachments: [
    {
      filename: 'logo.png',
      path: './assets/logo.png',
      cid: 'logo@nodemailer' // unique identifier for this attachment
    }
  ],
  html: '<p><img src="cid:logo@nodemailer" alt="Nodemailer logo"></p>'
}
```

</div>

</div>

When an attachment has a `cid` and the content type is an image, Nodemailer automatically sets the Content-Disposition to `inline` rather than `attachment`, so the image displays within the email body rather than appearing as a downloadable file.

</div>

<a href="/message/addresses" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

Address object

</div>

<a href="/message/embedded-images" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

Embedded images

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#examples" class="table-of-contents__link toc-highlight">Examples</a>
- <a href="#embedding-images" class="table-of-contents__link toc-highlight">Embedding images</a>

</div>

</div>

</div>

</div>

</div>
