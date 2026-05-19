<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <a href="/message" class="breadcrumbs__link"><span>Message configuration</span></a>
- <span class="breadcrumbs__link">Alternatives</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# Alternatives

</div>

In addition to plain text and HTML, you can include **alternative representations** of your email content. These are different formats of the same message, such as Markdown or a calendar invite. When recipients open your email, their email client automatically selects and displays the best format it supports.

Common use cases for alternatives include:

- Calendar event invitations (though see the tip below)
- Markdown versions of HTML content
- Other machine-readable formats that some email clients can process

<div class="theme-admonition theme-admonition-tip admonition_xJq3 alert alert--success">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTIgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTYuNSAwQzMuNDggMCAxIDIuMTkgMSA1YzAgLjkyLjU1IDIuMjUgMSAzIDEuMzQgMi4yNSAxLjc4IDIuNzggMiA0djFoNXYtMWMuMjItMS4yMi42Ni0xLjc1IDItNCAuNDUtLjc1IDEtMi4wOCAxLTMgMC0yLjgxLTIuNDgtNS01LjUtNXptMy42NCA3LjQ4Yy0uMjUuNDQtLjQ3LjgtLjY3IDEuMTEtLjg2IDEuNDEtMS4yNSAyLjA2LTEuNDUgMy4yMy0uMDIuMDUtLjAyLjExLS4wMi4xN0g1YzAtLjA2IDAtLjEzLS4wMi0uMTctLjItMS4xNy0uNTktMS44My0xLjQ1LTMuMjMtLjItLjMxLS40Mi0uNjctLjY3LTEuMTFDMi40NCA2Ljc4IDIgNS42NSAyIDVjMC0yLjIgMi4wMi00IDQuNS00IDEuMjIgMCAyLjM2LjQyIDMuMjIgMS4xOUMxMC41NSAyLjk0IDExIDMuOTQgMTEgNWMwIC42Ni0uNDQgMS43OC0uODYgMi40OHpNNCAxNGg1Yy0uMjMgMS4xNC0xLjMgMi0yLjUgMnMtMi4yNy0uODYtMi41LTJ6IiAvPjwvc3ZnPg==)</span>Prefer `icalEvent` for calendar invites

</div>

<div class="admonitionContent_BuS1">

For calendar events specifically, use the dedicated **`icalEvent`** option instead of alternatives. It provides a simpler API with better compatibility. See [Calendar events](/message/calendar-events) for details.

</div>

</div>

## How alternatives differ from attachments<a href="#how-alternatives-differ-from-attachments" class="hash-link" aria-label="Direct link to How alternatives differ from attachments" translate="no" title="Direct link to How alternatives differ from attachments">​</a>

Alternative objects use the same fields as [attachment objects](/message/attachments), including `content`, `path`, `contentType`, `encoding`, and `headers`. The key difference is how they appear in the email structure:

- **Attachments** are separate files that recipients download. They go in `multipart/mixed` or `multipart/related` containers.
- **Alternatives** are different versions of the email body itself. They go in a `multipart/alternative` container, and the email client picks one to display.

| Purpose | MIME container | What recipients see |
|----|----|----|
| Attachments | `multipart/mixed` or `multipart/related` | Downloadable files alongside the email |
| **Alternatives** | `multipart/alternative` | One of several body formats |

## Usage<a href="#usage" class="hash-link" aria-label="Direct link to Usage" translate="no" title="Direct link to Usage">​</a>

Add an `alternatives` array to your message object. Each alternative needs at minimum a `contentType` and either `content` or `path`:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const message = {
  from: "sender@example.com",
  to: "recipient@example.com",
  subject: "Hello",
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

In this example, the email includes both an HTML body and a Markdown alternative. Email clients that support Markdown can choose to render it instead of the HTML.

### Ordering matters<a href="#ordering-matters" class="hash-link" aria-label="Direct link to Ordering matters" translate="no" title="Direct link to Ordering matters">​</a>

You can include as many alternatives as you need. According to the MIME standard (RFC 2046), you should place your preferred format last in the list. Email clients read alternatives from top to bottom and typically display the last format they can understand.

For example, if you include plain text, Markdown, and HTML in that order, most email clients will display the HTML version since it comes last and is widely supported.

</div>

<a href="/message/calendar-events" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

Calendar events

</div>

<a href="/message/custom-headers" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

Custom headers

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#how-alternatives-differ-from-attachments" class="table-of-contents__link toc-highlight">How alternatives differ from attachments</a>
- <a href="#usage" class="table-of-contents__link toc-highlight">Usage</a>
  - <a href="#ordering-matters" class="table-of-contents__link toc-highlight">Ordering matters</a>

</div>

</div>

</div>

</div>

</div>
