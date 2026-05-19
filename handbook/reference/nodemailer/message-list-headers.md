<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <a href="/message" class="breadcrumbs__link"><span>Message configuration</span></a>
- <span class="breadcrumbs__link">List headers</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# List headers

</div>

Mailing lists use special <a href="https://www.rfc-editor.org/rfc/rfc2369" target="_blank" rel="noopener noreferrer">RFC 2369</a> **`List-*` headers** (such as `List-Help`, `List-Unsubscribe`, and others) to help email clients display useful actions like "Unsubscribe" buttons. Instead of manually constructing these headers using the [custom headers](/message/custom-headers) option, you can use Nodemailer's **`list`** option to define them in a simple, declarative way.

## How it works<a href="#how-it-works" class="hash-link" aria-label="Direct link to How it works" translate="no" title="Direct link to How it works">​</a>

Add a `list` object to your `transporter.sendMail()` call. Each property name in this object corresponds to a `List-*` header. The property names are case-insensitive, so `help` creates a `List-Help` header, `unsubscribe` creates `List-Unsubscribe`, and so on.

### Value formats<a href="#value-formats" class="hash-link" aria-label="Direct link to Value formats" translate="no" title="Direct link to Value formats">​</a>

| Value type | Result |
|----|----|
| `string` | A single URL. Nodemailer automatically wraps it in angle brackets (`<...>`) and adds `mailto:` if needed. |
| `{ url, comment }` | A URL with an optional human-readable comment displayed after it. |
| `Array< string | { url, comment } >` | Multiple separate header lines for the same `List-*` type. |
| Nested array (`Array<Array<...>>`) | Multiple URLs combined into a single header line, separated by commas. |

<div class="theme-admonition theme-admonition-tip admonition_xJq3 alert alert--success">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTIgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTYuNSAwQzMuNDggMCAxIDIuMTkgMSA1YzAgLjkyLjU1IDIuMjUgMSAzIDEuMzQgMi4yNSAxLjc4IDIuNzggMiA0djFoNXYtMWMuMjItMS4yMi42Ni0xLjc1IDItNCAuNDUtLjc1IDEtMi4wOCAxLTMgMC0yLjgxLTIuNDgtNS01LjUtNXptMy42NCA3LjQ4Yy0uMjUuNDQtLjQ3LjgtLjY3IDEuMTEtLjg2IDEuNDEtMS4yNSAyLjA2LTEuNDUgMy4yMy0uMDIuMDUtLjAyLjExLS4wMi4xN0g1YzAtLjA2IDAtLjEzLS4wMi0uMTctLjItMS4xNy0uNTktMS44My0xLjQ1LTMuMjMtLjItLjMxLS40Mi0uNjctLjY3LTEuMTFDMi40NCA2Ljc4IDIgNS42NSAyIDVjMC0yLjIgMi4wMi00IDQuNS00IDEuMjIgMCAyLjM2LjQyIDMuMjIgMS4xOUMxMC41NSAyLjk0IDExIDMuOTQgMTEgNWMwIC42Ni0uNDQgMS43OC0uODYgMi40OHpNNCAxNGg1Yy0uMjMgMS4xNC0xLjMgMi0yLjUgMnMtMi4yNy0uODYtMi41LTJ6IiAvPjwvc3ZnPg==)</span>URL handling

</div>

<div class="admonitionContent_BuS1">

Nodemailer automatically formats URLs for you:

- Email addresses like `admin@example.com` become `<mailto:admin@example.com>`
- URLs starting with `http`, `https`, `mailto`, or `ftp` are wrapped in angle brackets as-is
- Other strings are treated as domains and prefixed with `http://`

Comments containing non-ASCII characters are automatically encoded for email compatibility.

</div>

</div>

## Complete example<a href="#complete-example" class="hash-link" aria-label="Direct link to Complete example" translate="no" title="Direct link to Complete example">​</a>

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const nodemailer = require("nodemailer");

// 1. Create a transport (replace with your configuration)
const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 587,
  auth: {
    user: "username",
    pass: "password",
  },
});

// 2. Send a message with various List-* headers
async function sendListMessage() {
  await transporter.sendMail({
    from: "sender@example.com",
    to: "recipient@example.com",
    subject: "List Message",
    text: "I hope no one unsubscribes from this list!",
    list: {
      // List-Help: <mailto:admin@example.com?subject=help>
      help: "admin@example.com?subject=help",

      // List-Unsubscribe: <http://example.com> (Comment)
      unsubscribe: {
        url: "http://example.com",
        comment: "Comment",
      },

      // Two separate List-Subscribe header lines:
      // List-Subscribe: <mailto:admin@example.com?subject=subscribe>
      // List-Subscribe: <http://example.com> (Subscribe)
      subscribe: [
        "admin@example.com?subject=subscribe",
        {
          url: "http://example.com",
          comment: "Subscribe",
        },
      ],

      // Multiple URLs in a single List-Post header line:
      // List-Post: <http://example.com/post>, <mailto:admin@example.com?subject=post> (Post)
      post: [
        [
          "http://example.com/post",
          {
            url: "admin@example.com?subject=post",
            comment: "Post",
          },
        ],
      ],
    },
  });

  console.log("List message sent");
}

sendListMessage().catch(console.error);
```

</div>

</div>

### Resulting headers<a href="#resulting-headers" class="hash-link" aria-label="Direct link to Resulting headers" translate="no" title="Direct link to Resulting headers">​</a>

The example above produces these email headers:

<div class="language-txt codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` txt
List-Help: <mailto:admin@example.com?subject=help>
List-Unsubscribe: <http://example.com> (Comment)
List-Subscribe: <mailto:admin@example.com?subject=subscribe>
List-Subscribe: <http://example.com> (Subscribe)
List-Post: <http://example.com/post>, <mailto:admin@example.com?subject=post> (Post)
```

</div>

</div>

</div>

<a href="/message/custom-headers" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

Custom headers

</div>

<a href="/message/dsn" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

Delivery Status Notifications (DSN)

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#how-it-works" class="table-of-contents__link toc-highlight">How it works</a>
  - <a href="#value-formats" class="table-of-contents__link toc-highlight">Value formats</a>
- <a href="#complete-example" class="table-of-contents__link toc-highlight">Complete example</a>
  - <a href="#resulting-headers" class="table-of-contents__link toc-highlight">Resulting headers</a>

</div>

</div>

</div>

</div>

</div>
