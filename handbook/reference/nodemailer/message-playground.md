<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <a href="/message" class="breadcrumbs__link"><span>Message configuration</span></a>
- <span class="breadcrumbs__link">Message Playground</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# Message Playground

</div>

Use this interactive playground to experiment with Nodemailer message configuration and see a live preview of how your email will appear to recipients.

Switch between the **Editor** tab to modify the JSON configuration and the **Preview** tab to see how your email will render. The playground supports all common message fields including `from`, `to`, `cc`, `bcc`, `subject`, `text`, and `html`.

<div class="playground_d6bb">

<div class="tabsWrapper_C0o5">

<div class="theme-tabs-container tabs-container tabList__CuJ">

- Editor
- Preview

<div class="margin-top--md">

<div class="tabItem_Ymn6" role="tabpanel">

<div class="editorPane_ZCPp">

<div class="editorContainer_xGRr">

<div class="editorHeader_Q9hF">

<span class="editorTitle_eALL">Message Configuration (JSON)</span>

</div>

</div>

</div>

</div>

<div class="tabItem_Ymn6" role="tabpanel" hidden="">

<div class="previewPane_kS2O">

<div class="emailPreview_fqfG">

<div class="emailHeader_BbLe">

<div class="subjectRow_jiXV">

## Hello from Nodemailer!

</div>

<div class="addressSection_ndUQ">

<div class="headerRow_Shci">

<span class="headerLabel_TsHL">From:</span><span class="headerValue__ti9"><span class="addressChip_dWwW"><span class="addressName_YmCZ">Sender Name</span><span class="addressEmail_laZS">\<sender@example.com\></span></span></span>

</div>

<div class="headerRow_Shci">

<span class="headerLabel_TsHL">To:</span><span class="headerValue__ti9"><span class="addressChip_dWwW"><span class="addressEmail_laZS">\<recipient@example.com\></span></span></span>

</div>

<div class="headerRow_Shci">

<span class="headerLabel_TsHL">Cc:</span><span class="headerValue__ti9"><span class="addressChip_dWwW"><span class="addressEmail_laZS">\<cc@example.com\></span></span></span>

</div>

</div>

</div>

<div class="attachmentSection__Pk_">

<div class="attachmentHeader_vMwV">

<span class="attachmentIcon_zggJ">📎</span><span class="attachmentTitle_cHRI">1 Attachment</span>

</div>

<div class="attachmentList_IWJt">

<span class="attachmentFileIcon_EYiq">📄</span><span class="attachmentInfo_dMEH"><span class="attachmentFilename_dhUm">document.pdf</span><span class="attachmentSize_bW6S">591 B</span></span><span class="downloadIcon_JBVt">⬇️</span>

</div>

</div>

<div class="emailBody_mJ3J">

</div>

</div>

</div>

</div>

</div>

</div>

Reset

</div>

</div>

## Supported fields<a href="#supported-fields" class="hash-link" aria-label="Direct link to Supported fields" translate="no" title="Direct link to Supported fields">​</a>

The playground supports the following message configuration fields:

| Field         | Description                                                 |
|---------------|-------------------------------------------------------------|
| `from`        | Sender address (string or object with `name` and `address`) |
| `to`          | Recipient address(es) - string, array, or object            |
| `cc`          | Carbon copy recipient(s)                                    |
| `bcc`         | Blind carbon copy recipient(s)                              |
| `replyTo`     | Reply-to address(es)                                        |
| `subject`     | Email subject line                                          |
| `text`        | Plain text message body                                     |
| `html`        | HTML message body (takes precedence over `text`)            |
| `attachments` | Array of attachment objects (see limitations below)         |

<div class="theme-admonition theme-admonition-tip admonition_xJq3 alert alert--success">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTIgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTYuNSAwQzMuNDggMCAxIDIuMTkgMSA1YzAgLjkyLjU1IDIuMjUgMSAzIDEuMzQgMi4yNSAxLjc4IDIuNzggMiA0djFoNXYtMWMuMjItMS4yMi42Ni0xLjc1IDItNCAuNDUtLjc1IDEtMi4wOCAxLTMgMC0yLjgxLTIuNDgtNS01LjUtNXptMy42NCA3LjQ4Yy0uMjUuNDQtLjQ3LjgtLjY3IDEuMTEtLjg2IDEuNDEtMS4yNSAyLjA2LTEuNDUgMy4yMy0uMDIuMDUtLjAyLjExLS4wMi4xN0g1YzAtLjA2IDAtLjEzLS4wMi0uMTctLjItMS4xNy0uNTktMS44My0xLjQ1LTMuMjMtLjItLjMxLS40Mi0uNjctLjY3LTEuMTFDMi40NCA2Ljc4IDIgNS42NSAyIDVjMC0yLjIgMi4wMi00IDQuNS00IDEuMjIgMCAyLjM2LjQyIDMuMjIgMS4xOUMxMC41NSAyLjk0IDExIDMuOTQgMTEgNWMwIC42Ni0uNDQgMS43OC0uODYgMi40OHpNNCAxNGg1Yy0uMjMgMS4xNC0xLjMgMi0yLjUgMnMtMi4yNy0uODYtMi41LTJ6IiAvPjwvc3ZnPg==)</span>tip

</div>

<div class="admonitionContent_BuS1">

If you only provide a `text` field without `html`, the playground will automatically convert the plain text to a simple HTML representation for preview purposes.

</div>

</div>

<div class="theme-admonition theme-admonition-warning admonition_xJq3 alert alert--warning">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTYgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTguODkzIDEuNWMtLjE4My0uMzEtLjUyLS41LS44ODctLjVzLS43MDMuMTktLjg4Ni41TC4xMzggMTMuNDk5YS45OC45OCAwIDAgMCAwIDEuMDAxYy4xOTMuMzEuNTMuNTAxLjg4Ni41MDFoMTMuOTY0Yy4zNjcgMCAuNzA0LS4xOS44NzctLjVhMS4wMyAxLjAzIDAgMCAwIC4wMS0xLjAwMkw4Ljg5MyAxLjV6bS4xMzMgMTEuNDk3SDYuOTg3di0yLjAwM2gyLjAzOXYyLjAwM3ptMC0zLjAwNEg2Ljk4N1Y1Ljk4N2gyLjAzOXY0LjAwNnoiIC8+PC9zdmc+)</span>Attachment limitations

</div>

<div class="admonitionContent_BuS1">

The playground only supports attachments with base64-encoded content. Other content sources (file paths, URLs, streams, buffers) are not available in the browser environment. Each attachment must include:

- `content` - Base64-encoded string
- `encoding` - Must be set to `"base64"`
- `filename` - Name of the file
- `contentType` - MIME type (optional, detected from filename if omitted)
- `cid` - Content-ID for embedding images in HTML (optional)

Attachments with a `cid` value can be referenced in HTML using `<img src="cid:your-cid-value">`.

</div>

</div>

## Address formats<a href="#address-formats" class="hash-link" aria-label="Direct link to Address formats" translate="no" title="Direct link to Address formats">​</a>

You can specify email addresses in several formats:

<div class="language-json codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` json
// Plain email address
"to": "recipient@example.com"

// With display name
"to": "\"Recipient Name\" <recipient@example.com>"

// Object format
"to": { "name": "Recipient Name", "address": "recipient@example.com" }

// Multiple recipients (array)
"to": ["user1@example.com", "user2@example.com"]

// Multiple recipients (comma-separated)
"to": "user1@example.com, user2@example.com"
```

</div>

</div>

For more details on message configuration, see the [message configuration reference](/message).

</div>

<a href="/message/custom-source" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

Custom source

</div>

<a href="/smtp" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

SMTP transport

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#supported-fields" class="table-of-contents__link toc-highlight">Supported fields</a>
- <a href="#address-formats" class="table-of-contents__link toc-highlight">Address formats</a>

</div>

</div>

</div>

</div>

</div>
