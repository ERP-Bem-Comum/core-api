<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <a href="/message" class="breadcrumbs__link"><span>Message configuration</span></a>
- <span class="breadcrumbs__link">Embedded images</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# Embedded images

</div>

Embedded images are images that display directly in the email body rather than appearing as downloadable attachments. You can embed images in your HTML emails by including them in the [attachments](/message/attachments) array and referencing them using the `cid:` (Content-ID) URL scheme.

Here is how to embed an image in three steps:

1.  Add the image to the [attachments](/message/attachments) array in your message options.
2.  Assign a unique [`cid`](/message/attachments) (Content-ID) value to the attachment.
3.  Reference the image in your HTML using `src="cid:your-cid-value"`.

<div class="theme-admonition theme-admonition-info admonition_xJq3 alert alert--info">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTQgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTcgMi4zYzMuMTQgMCA1LjcgMi41NiA1LjcgNS43cy0yLjU2IDUuNy01LjcgNS43QTUuNzEgNS43MSAwIDAgMSAxLjMgOGMwLTMuMTQgMi41Ni01LjcgNS43LTUuN3pNNyAxQzMuMTQgMSAwIDQuMTQgMCA4czMuMTQgNyA3IDcgNy0zLjE0IDctNy0zLjE0LTctNy03em0xIDNINnY1aDJWNHptMCA2SDZ2Mmgydi0yeiIgLz48L3N2Zz4=)</span>Why use embedded images?

</div>

<div class="admonitionContent_BuS1">

Many email clients block external images by default for privacy and security reasons. Embedded images bypass this restriction because the image data travels inside the message itself, so the recipient sees the image immediately without needing to click "load images."

</div>

</div>

<div class="theme-admonition theme-admonition-note admonition_xJq3 alert alert--secondary">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTQgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTYuMyA1LjY5YS45NDIuOTQyIDAgMCAxLS4yOC0uN2MwLS4yOC4wOS0uNTIuMjgtLjcuMTktLjE4LjQyLS4yOC43LS4yOC4yOCAwIC41Mi4wOS43LjI4LjE4LjE5LjI4LjQyLjI4LjcgMCAuMjgtLjA5LjUyLS4yOC43YTEgMSAwIDAgMS0uNy4zYy0uMjggMC0uNTItLjExLS43LS4zek04IDcuOTljLS4wMi0uMjUtLjExLS40OC0uMzEtLjY5LS4yLS4xOS0uNDItLjMtLjY5LS4zMUg2Yy0uMjcuMDItLjQ4LjEzLS42OS4zMS0uMi4yLS4zLjQ0LS4zMS42OWgxdjNjLjAyLjI3LjExLjUuMzEuNjkuMi4yLjQyLjMxLjY5LjMxaDFjLjI3IDAgLjQ4LS4xMS42OS0uMzEuMi0uMTkuMy0uNDIuMzEtLjY5SDhWNy45OHYuMDF6TTcgMi4zYy0zLjE0IDAtNS43IDIuNTQtNS43IDUuNjggMCAzLjE0IDIuNTYgNS43IDUuNyA1LjdzNS43LTIuNTUgNS43LTUuN2MwLTMuMTUtMi41Ni01LjY5LTUuNy01LjY5di4wMXpNNyAuOThjMy44NiAwIDcgMy4xNCA3IDdzLTMuMTQgNy03IDctNy0zLjEyLTctNyAzLjE0LTcgNy03eiIgLz48L3N2Zz4=)</span>Choosing a unique cid

</div>

<div class="admonitionContent_BuS1">

The **cid** value must be unique within the message. A recommended pattern is to use an email-like format with a domain you control, such as `logo@example.com` or `header-image@mycompany.com`. This format helps ensure uniqueness and follows email standards.

</div>

</div>

#### Basic example<a href="#basic-example" class="hash-link" aria-label="Direct link to Basic example" translate="no" title="Direct link to Basic example">​</a>

This example shows how to embed a single image from a file path. The `cid` value in the attachment must match the value used in the HTML `src` attribute (without the `cid:` prefix).

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const message = {
  from: "Alice <alice@example.com>",
  to: "Bob <bob@example.com>",
  subject: "Inline image test",
  html: 'Embedded image: <img src="cid:logo@example.com" alt="Company logo"/>',
  attachments: [
    {
      filename: "logo.png",
      path: "/path/to/logo.png",
      cid: "logo@example.com", // matches the cid in the img src attribute
    },
  ],
};
```

</div>

</div>

#### Using a Buffer instead of a file<a href="#using-a-buffer-instead-of-a-file" class="hash-link" aria-label="Direct link to Using a Buffer instead of a file" translate="no" title="Direct link to Using a Buffer instead of a file">​</a>

Instead of specifying a file path, you can provide the image data directly as a Buffer. This is useful when the image is generated dynamically or already loaded in memory.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const fs = require("fs");

const message = {
  from: "Alice <alice@example.com>",
  to: "Bob <bob@example.com>",
  subject: "Screenshot attached",
  html: '<img src="cid:screenshot@example.com" alt="Screenshot"/>',
  attachments: [
    {
      filename: "screenshot.png",
      content: fs.readFileSync("/tmp/screenshot.png"), // Buffer containing the image data
      cid: "screenshot@example.com",
    },
  ],
};
```

</div>

</div>

#### Embedding multiple images<a href="#embedding-multiple-images" class="hash-link" aria-label="Direct link to Embedding multiple images" translate="no" title="Direct link to Embedding multiple images">​</a>

You can embed multiple images in the same email. Each image needs its own unique `cid` value, and each must be listed as a separate entry in the `attachments` array.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const message = {
  from: "Reports <reports@example.com>",
  to: "Team <team@example.com>",
  subject: "Monthly report",
  html: `
    <h1>Monthly Report</h1>
    <p>Here are this month's results:</p>
    <img src="cid:chart@example.com" alt="Sales chart"/>
    <img src="cid:badge@example.com" alt="Achievement badge"/>
  `,
  attachments: [
    { filename: "chart.png", path: "./chart.png", cid: "chart@example.com" },
    { filename: "badge.png", path: "./badge.png", cid: "badge@example.com" },
  ],
};
```

</div>

</div>

</div>

<a href="/message/attachments" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

Attachments

</div>

<a href="/message/calendar-events" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

Calendar events

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

</div>

</div>

</div>

</div>

</div>
