<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <span class="breadcrumbs__link">Message configuration</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# Message configuration

</div>

This page describes all available fields you can use when composing an email message with Nodemailer. Most emails only need a few basic fields, but advanced options are available when you need more control.

### Common fields<a href="#common-fields" class="hash-link" aria-label="Direct link to Common fields" translate="no" title="Direct link to Common fields">​</a>

These are the fields you will use most often when sending emails:

- **from** - The email address of the sender. You can use a plain address like `'sender@server.com'` or include a display name like `'"Sender Name" <sender@server.com>'`. See [Address object](/message/addresses) for more formatting options.
- **to** - The recipients who will appear in the *To:* field. Accepts a comma-separated string or an array of addresses.
- **cc** - The recipients who will appear in the *Cc:* (carbon copy) field. Accepts a comma-separated string or an array of addresses.
- **bcc** - The recipients who will appear in the *Bcc:* (blind carbon copy) field. These recipients receive the email but are hidden from other recipients. Accepts a comma-separated string or an array of addresses.
- **subject** - The subject line of the email.
- **text** - The plaintext version of the message body. Can be a string, Buffer, Stream, or an attachment-like object (for example, `{path: '/var/data/message.txt'}`).
- **html** - The HTML version of the message body. Can be a string, Buffer, Stream, or an attachment-like object (for example, `{path: 'http://example.com/email.html'}`).
- **attachments** - An array of attachment objects. See [Using attachments](/message/attachments) for details. You can also use attachments for [embedding images](/message/embedded-images) in your HTML content.

The following example shows a typical email using only the basic fields:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const message = {
  from: "sender@server.com",
  to: "receiver@example.com",
  subject: "Hello World",
  text: "This is the plaintext version of the email.",
  html: "<p>This is the <strong>HTML version</strong> of the email.</p>",
};
```

</div>

</div>

### More advanced fields<a href="#more-advanced-fields" class="hash-link" aria-label="Direct link to More advanced fields" translate="no" title="Direct link to More advanced fields">​</a>

The following sections cover additional options for fine-tuning your email messages.

##### Routing options<a href="#routing-options" class="hash-link" aria-label="Direct link to Routing options" translate="no" title="Direct link to Routing options">​</a>

These options control how the email is addressed and how replies are handled:

- **sender** - An email address that will appear in the *Sender:* field. This is typically used when the actual sender differs from the address in the *From:* field (for example, when sending on behalf of someone else). In most cases, you should use **from** instead.
- **replyTo** - An email address that will appear in the *Reply-To:* field. When recipients reply to your email, their response will be sent to this address instead of the *From:* address.
- **inReplyTo** - The Message-ID of the email this message is replying to. This helps email clients thread conversations together.
- **references** - A list of Message-IDs that this email references. Can be an array of strings or a space-separated string. Used for threading related messages together.
- **envelope** - A custom SMTP envelope, if the automatically generated envelope is not suitable for your needs. See [SMTP envelope](/smtp/envelope) for details.
- **dsn** - Request [Delivery Status Notifications](/message/dsn) (RFC 3461) for this message. You can be notified when a message is delivered, delayed, or bounced.
- **requireTLSExtensionEnabled** - When set to `true`, the SMTP `REQUIRETLS` extension (RFC 8689) is used. This ensures TLS encryption is required for the entire delivery chain, not just the first hop. The connection must already be using TLS, and the server must advertise REQUIRETLS support. Can also be set inside the [envelope](/smtp/envelope) object.

##### Content options<a href="#content-options" class="hash-link" aria-label="Direct link to Content options" translate="no" title="Direct link to Content options">​</a>

These options provide additional ways to control the message content:

- **attachDataUrls** - When set to `true`, Nodemailer automatically converts `data:` URI images in your HTML content into embedded attachments. This is useful when your HTML contains inline images encoded as data URIs.
- **watchHtml** - An Apple Watch-specific HTML version of the message. Note that modern Apple Watches render standard `text/html` content well, so this field is rarely needed.
- **amp** - An AMP4EMAIL-specific HTML version of the message. Works the same way as `text` and `html`. See the [AMP example below](#amp-example) for usage, or read <a href="https://blog.nodemailer.com/2019/12/30/testing-amp4email-with-nodemailer/" target="_blank" rel="noopener noreferrer">this blog post</a> for more details about sending and rendering AMP emails.
- **icalEvent** - An iCalendar event to include as an alternative content type. This is useful for sending calendar invitations. See [Calendar events](/message/calendar-events) for details.
- **alternatives** - An array of alternative content representations (in addition to the text and HTML parts). See [Using alternative content](/message/alternatives) for details.
- **encoding** - Sets the `Content-Transfer-Encoding` header for text and HTML parts. When specified, this value is used directly as the transfer encoding (e.g., `'base64'`, `'quoted-printable'`, `'7bit'`, `'8bit'`). This is different from `textEncoding`, which controls how text content is automatically encoded.
- **raw** - An existing MIME message to send instead of generating a new one. Use this when you have a pre-built email message. See [Custom source](/message/custom-source) for details.
- **textEncoding** - Forces a specific content-transfer-encoding for text content. Valid values are `'quoted-printable'` or `'base64'`. By default, Nodemailer automatically chooses the best option: `quoted-printable` for content with mostly ASCII characters, and `base64` otherwise.

##### Header options<a href="#header-options" class="hash-link" aria-label="Direct link to Header options" translate="no" title="Direct link to Header options">​</a>

These options let you customize the email headers:

- **priority** - Sets the message importance level. Valid values are `'high'`, `'normal'` (the default), or `'low'`. This adds the appropriate `X-Priority`, `X-MSMail-Priority`, and `Importance` headers to your message.
- **headers** - Custom header fields to add to the message. Can be an object like `{"X-Key-Name": "key value"}` or an array for multiple values with the same key: `[{key: "X-Key-Name", value: "val1"}, {key: "X-Key-Name", value: "val2"}]`. See [Custom headers](/message/custom-headers) for more details.
- **messageId** - A custom Message-ID value for the email. If not provided, Nodemailer generates a random unique identifier automatically.
- **date** - The date to use for the email's Date header. If not provided, the current date and time (in UTC) is used. You can pass a Date object or a date string.
- **list** - A helper object for setting List-\* headers, commonly used for mailing list messages. See [List headers](/message/list-headers) for more details.

##### Security options<a href="#security-options" class="hash-link" aria-label="Direct link to Security options" translate="no" title="Direct link to Security options">​</a>

These options help protect your application when processing email data from untrusted sources:

- **disableFileAccess** - When set to `true`, prevents Nodemailer from reading files from the filesystem. Use this option when constructing emails from untrusted JSON data to prevent attackers from reading arbitrary files. If an attachment or message node attempts to read from a file path, the send operation will return an error. Note: If this option is also set in the transport configuration, the transport-level setting takes precedence.
- **disableUrlAccess** - When set to `true`, prevents Nodemailer from fetching content from URLs. This is useful for preventing server-side request forgery (SSRF) attacks when processing untrusted email data. Note: If this option is also set in the transport configuration, the transport-level setting takes precedence.

##### Advanced options<a href="#advanced-options" class="hash-link" aria-label="Direct link to Advanced options" translate="no" title="Direct link to Advanced options">​</a>

These options are rarely needed but provide fine-grained control over the generated MIME message:

- **normalizeHeaderKey** - A function to customize header key casing. The function receives the header key and value as arguments and should return the normalized key. Useful when you need specific header capitalization for compatibility with certain email systems.
- **boundaryPrefix** - A custom prefix for MIME boundary strings. Defaults to `'--_NmP'`. Boundaries separate different parts of a multipart message.
- **baseBoundary** - A shared base string used when generating unique MIME boundaries. Defaults to a random hex string. All boundaries in the message will be derived from this value.
- **newline** - Controls the line ending style in the generated message. Set to `'windows'` (or `'dos'`, `'win'`, `'\r\n'`) for Windows-style CRLF line endings, or `'unix'` (or `'linux'`, `'\n'`) for Unix-style LF line endings.
- **xMailer** - A custom value for the X-Mailer header, which typically identifies the software that generated the email. Set to `false` to omit this header entirely.
- **dkim** - Per-message DKIM signing configuration that overrides the transport-level settings. See [DKIM signing](/dkim) for details.

The following example demonstrates setting a custom header and a specific date:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const message = {
  from: "sender@example.com",
  to: "recipient@example.com",
  subject: "Custom Headers Example",
  text: "Hello!",
  headers: {
    "X-Custom-Header": "my custom value",
  },
  date: new Date("2000-01-01 00:00:00"),
};
```

</div>

</div>

You can also use a readable stream as the HTML content. When using streams, make sure to handle errors properly and clean up resources:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const htmlStream = fs.createReadStream("content.html");
transporter.sendMail({ html: htmlStream }, function (err) {
  if (err) {
    // If an error occurred, check if the stream is still open and close it
    if (!htmlStream.closed) {
      htmlStream.destroy();
    }
  }
});
```

</div>

</div>

##### AMP example<a href="#amp-example" class="hash-link" aria-label="Direct link to AMP example" translate="no" title="Direct link to AMP example">​</a>

AMP4EMAIL allows you to create interactive, dynamic emails. The following example shows how to include an AMP version of your email alongside the standard text and HTML versions. Email clients that support AMP will display the AMP content, while others will fall back to the HTML or plaintext versions:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const message = {
  from: "Nodemailer <example@nodemailer.com>",
  to: "Nodemailer <example@nodemailer.com>",
  subject: "AMP4EMAIL message",
  text: "For clients with plaintext support only",
  html: "<p>For clients that do not support AMP4EMAIL or when AMP content is invalid</p>",
  amp: `<!doctype html>
    <html ⚡4email>
      <head>
        <meta charset="utf-8">
        <style amp4email-boilerplate>body{visibility:hidden}</style>
        <script async src="https://cdn.ampproject.org/v0.js"></script>
        <script async custom-element="amp-anim" src="https://cdn.ampproject.org/v0/amp-anim-0.1.js"></script>
      </head>
      <body>
        <p>Image: <amp-img src="https://cldup.com/P0b1bUmEet.png" width="16" height="16"/></p>
        <p>GIF (requires "amp-anim" script in header):<br/>
          <amp-anim src="https://cldup.com/D72zpdwI-i.gif" width="500" height="350"/></p>
      </body>
    </html>`,
};
```

</div>

</div>

</div>

<a href="/" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

Nodemailer

</div>

<a href="/message/addresses" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

Address object

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#common-fields" class="table-of-contents__link toc-highlight">Common fields</a>
- <a href="#more-advanced-fields" class="table-of-contents__link toc-highlight">More advanced fields</a>

</div>

</div>

</div>

</div>

</div>
