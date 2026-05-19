<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <a href="/message" class="breadcrumbs__link"><span>Message configuration</span></a>
- <span class="breadcrumbs__link">Custom headers</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# Custom headers

</div>

Nodemailer automatically generates all required email headers, so you typically do not need to set them manually. However, when you need to add custom headers or override default values, you can use the **`headers`** property. This works both at the message level and for individual [attachments](/message/attachments) or alternatives.

- **`headers`** - an object where each key-value pair becomes an email header.

  - Keys are automatically converted to their standard capitalized form (for example, `x-my-key` becomes `X-My-Key`).
  - Values are automatically encoded for non-ASCII characters using MIME word encoding, and long lines are wrapped to comply with the 78-character line limit. You can disable this automatic processing by using the `prepared` option.

<div class="theme-admonition theme-admonition-warning admonition_xJq3 alert alert--warning">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTYgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTguODkzIDEuNWMtLjE4My0uMzEtLjUyLS41LS44ODctLjVzLS43MDMuMTktLjg4Ni41TC4xMzggMTMuNDk5YS45OC45OCAwIDAgMCAwIDEuMDAxYy4xOTMuMzEuNTMuNTAxLjg4Ni41MDFoMTMuOTY0Yy4zNjcgMCAuNzA0LS4xOS44NzctLjVhMS4wMyAxLjAzIDAgMCAwIC4wMS0xLjAwMkw4Ljg5MyAxLjV6bS4xMzMgMTEuNDk3SDYuOTg3di0yLjAwM2gyLjAzOXYyLjAwM3ptMC0zLjAwNEg2Ljk4N1Y1Ljk4N2gyLjAzOXY0LjAwNnoiIC8+PC9zdmc+)</span>warning

</div>

<div class="admonitionContent_BuS1">

Do **not** set protected headers such as `From`, `Sender`, `To`, `Cc`, `Bcc`, `Reply-To`, `In-Reply-To`, `References`, `Subject`, `Message-ID`, or `Date` using the `headers` property. Nodemailer manages these headers internally and will overwrite any values you set. Instead, use the dedicated [message properties](/message/) (for example, `from`, `to`, `subject`) to set these values.

</div>

</div>

------------------------------------------------------------------------

## Examples<a href="#examples" class="hash-link" aria-label="Direct link to Examples" translate="no" title="Direct link to Examples">​</a>

### 1. Add simple custom headers<a href="#1-add-simple-custom-headers" class="hash-link" aria-label="Direct link to 1. Add simple custom headers" translate="no" title="Direct link to 1. Add simple custom headers">​</a>

Pass an object with your custom header names as keys and their values as strings. Nodemailer will format the header names correctly and include them in the outgoing email.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const message = {
  // other fields...
  headers: {
    "x-my-key": "header value",
    "x-another-key": "another value",
  },
};

/*
Results in these headers being added to the email:
X-My-Key: header value
X-Another-Key: another value
*/
```

</div>

</div>

### 2. Repeat the same header key<a href="#2-repeat-the-same-header-key" class="hash-link" aria-label="Direct link to 2. Repeat the same header key" translate="no" title="Direct link to 2. Repeat the same header key">​</a>

Some headers can appear multiple times in an email (such as `Received` or custom tracking headers). To add multiple headers with the same name, provide an array of values instead of a single string.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const message = {
  // other fields...
  headers: {
    "x-my-key": ["value for row 1", "value for row 2", "value for row 3"],
  },
};

/*
Results in three separate headers with the same name:
X-My-Key: value for row 1
X-My-Key: value for row 2
X-My-Key: value for row 3
*/
```

</div>

</div>

### 3. Bypass Nodemailer's encoding and folding<a href="#3-bypass-nodemailers-encoding-and-folding" class="hash-link" aria-label="Direct link to 3. Bypass Nodemailer&#39;s encoding and folding" translate="no" title="Direct link to 3. Bypass Nodemailer&#39;s encoding and folding">​</a>

By default, Nodemailer encodes non-ASCII characters and wraps long lines to comply with email standards. If you have already encoded the header value yourself or need to include the raw value exactly as-is, set `prepared: true` to prevent any processing.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const message = {
  // other fields...
  headers: {
    "x-processed": "a really long header or value with non-ascii characters",
    "x-unprocessed": {
      prepared: true,
      value: "a really long header or value with non-ascii characters",
    },
  },
};

/*
X-Processed: Header value is automatically encoded and wrapped if needed
X-Unprocessed: Header value is used exactly as provided, with no modifications
*/
```

</div>

</div>

### 4. Headers on an attachment<a href="#4-headers-on-an-attachment" class="hash-link" aria-label="Direct link to 4. Headers on an attachment" translate="no" title="Direct link to 4. Headers on an attachment">​</a>

You can also add custom headers to individual [attachments](/message/attachments). This is useful for adding metadata or tracking information to specific files within an email. Simply include a `headers` object inside the attachment definition.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const message = {
  // other fields...
  attachments: [
    {
      filename: "report.csv",
      content: csvBuffer,
      headers: {
        "x-report-id": "2025-Q1",
      },
    },
  ],
};
```

</div>

</div>

</div>

<a href="/message/alternatives" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

Alternatives

</div>

<a href="/message/list-headers" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

List headers

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#examples" class="table-of-contents__link toc-highlight">Examples</a>
  - <a href="#1-add-simple-custom-headers" class="table-of-contents__link toc-highlight">1. Add simple custom headers</a>
  - <a href="#2-repeat-the-same-header-key" class="table-of-contents__link toc-highlight">2. Repeat the same header key</a>
  - <a href="#3-bypass-nodemailers-encoding-and-folding" class="table-of-contents__link toc-highlight">3. Bypass Nodemailer's encoding and folding</a>
  - <a href="#4-headers-on-an-attachment" class="table-of-contents__link toc-highlight">4. Headers on an attachment</a>

</div>

</div>

</div>

</div>

</div>
