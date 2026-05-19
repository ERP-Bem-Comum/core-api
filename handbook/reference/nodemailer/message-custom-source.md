<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <a href="/message" class="breadcrumbs__link"><span>Message configuration</span></a>
- <span class="breadcrumbs__link">Custom source</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# Custom source

</div>

Sometimes you already have a fully-formatted RFC 822/EML message ready to send. This might happen when a message was composed by another system, retrieved from storage, parsed from an EML file using [MailParser](/extras/mailparser), or generated with [Mailcomposer](/extras/mailcomposer). In these cases, you can pass the pre-built content directly to Nodemailer using the **raw** option, and Nodemailer will send it without modifying the structure.

The **raw** option can be used at three different levels:

1.  **Whole message** - Provide a complete RFC 822 document including all headers and body content.
2.  **Per alternative** - Provide a pre-built MIME part for `text/plain`, `text/html`, or any other alternative content type.
3.  **Per attachment** - Provide a complete attachment including its MIME headers and body.

<div class="theme-admonition theme-admonition-tip admonition_xJq3 alert alert--success">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTIgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTYuNSAwQzMuNDggMCAxIDIuMTkgMSA1YzAgLjkyLjU1IDIuMjUgMSAzIDEuMzQgMi4yNSAxLjc4IDIuNzggMiA0djFoNXYtMWMuMjItMS4yMi42Ni0xLjc1IDItNCAuNDUtLjc1IDEtMi4wOCAxLTMgMC0yLjgxLTIuNDgtNS01LjUtNXptMy42NCA3LjQ4Yy0uMjUuNDQtLjQ3LjgtLjY3IDEuMTEtLjg2IDEuNDEtMS4yNSAyLjA2LTEuNDUgMy4yMy0uMDIuMDUtLjAyLjExLS4wMi4xN0g1YzAtLjA2IDAtLjEzLS4wMi0uMTctLjItMS4xNy0uNTktMS44My0xLjQ1LTMuMjMtLjItLjMxLS40Mi0uNjctLjY3LTEuMTFDMi40NCA2Ljc4IDIgNS42NSAyIDVjMC0yLjIgMi4wMi00IDQuNS00IDEuMjIgMCAyLjM2LjQyIDMuMjIgMS4xOUMxMC41NSAyLjk0IDExIDMuOTQgMTEgNWMwIC42Ni0uNDQgMS43OC0uODYgMi40OHpNNCAxNGg1Yy0uMjMgMS4xNC0xLjMgMi0yLjUgMnMtMi4yNy0uODYtMi41LTJ6IiAvPjwvc3ZnPg==)</span>Always set an envelope

</div>

<div class="admonitionContent_BuS1">

When you use **raw** for the entire message, you must also provide `envelope.from` and `envelope.to` explicitly. Nodemailer does not parse these values from the raw message content. The envelope tells the [SMTP](/smtp) server who the sender and recipients are during the mail transfer.

</div>

</div>

## Examples<a href="#examples" class="hash-link" aria-label="Direct link to Examples" translate="no" title="Direct link to Examples">​</a>

### 1. String as the entire message<a href="#1-string-as-the-entire-message" class="hash-link" aria-label="Direct link to 1. String as the entire message" translate="no" title="Direct link to 1. String as the entire message">​</a>

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const message = {
  envelope: {
    from: "sender@example.com",
    to: ["recipient@example.com"],
  },
  raw: `From: sender@example.com
To: recipient@example.com
Subject: Hello world

Hello world!`,
};
```

</div>

</div>

> When using a string, newlines are passed through as-is. If your mail server requires `\r\n` line endings (as per RFC 5321), make sure your raw content uses them.

### 2. EML file as the entire message<a href="#2-eml-file-as-the-entire-message" class="hash-link" aria-label="Direct link to 2. EML file as the entire message" translate="no" title="Direct link to 2. EML file as the entire message">​</a>

You can read the message content from a file on disk by providing a `path` property instead of a string.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const message = {
  envelope: {
    from: "sender@example.com",
    to: ["recipient@example.com"],
  },
  raw: {
    path: "/path/to/message.eml",
  },
};
```

</div>

</div>

The path can be absolute or relative to the current working directory (`process.cwd()`).

### 3. String as an attachment<a href="#3-string-as-an-attachment" class="hash-link" aria-label="Direct link to 3. String as an attachment" translate="no" title="Direct link to 3. String as an attachment">​</a>

When using **raw** inside the `attachments` array, you must include all of the MIME headers yourself. Nodemailer does not add `Content-Type`, `Content-Disposition`, or any other headers automatically.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const message = {
  from: "sender@example.com",
  to: "recipient@example.com",
  subject: "Custom attachment",
  attachments: [
    {
      raw: `Content-Type: text/plain
Content-Disposition: attachment; filename="notes.txt"

Attached text file`,
    },
  ],
};
```

</div>

</div>

</div>

<a href="/message/dsn" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

Delivery Status Notifications (DSN)

</div>

<a href="/message/playground" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

Message Playground

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#examples" class="table-of-contents__link toc-highlight">Examples</a>
  - <a href="#1-string-as-the-entire-message" class="table-of-contents__link toc-highlight">1. String as the entire message</a>
  - <a href="#2-eml-file-as-the-entire-message" class="table-of-contents__link toc-highlight">2. EML file as the entire message</a>
  - <a href="#3-string-as-an-attachment" class="table-of-contents__link toc-highlight">3. String as an attachment</a>

</div>

</div>

</div>

</div>

</div>
