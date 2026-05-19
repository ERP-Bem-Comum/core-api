<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <span class="breadcrumbs__link">Plugins</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# Plugins

</div>

Nodemailer is designed to be **extensible**. You can inject custom logic at three well-defined phases of a message's lifecycle:

| Phase | Keyword | When it runs | Typical uses |
|----|----|----|----|
| **Pre-processing** | `compile` | After the message object is created but *before* the MIME source is generated | Templating, automatic plain-text alternatives, address validation |
| **Processing** | `stream` | After MIME compilation, while the message stream is being prepared for sending | Inlining images, transforming HTML content |
| **Sending** | `transport` | When the message is ready to be delivered | [SMTP](/smtp), [SES](/transports/ses), SparkPost, custom HTTP APIs |

<div class="theme-admonition theme-admonition-tip admonition_xJq3 alert alert--success">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTIgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTYuNSAwQzMuNDggMCAxIDIuMTkgMSA1YzAgLjkyLjU1IDIuMjUgMSAzIDEuMzQgMi4yNSAxLjc4IDIuNzggMiA0djFoNXYtMWMuMjItMS4yMi42Ni0xLjc1IDItNCAuNDUtLjc1IDEtMi4wOCAxLTMgMC0yLjgxLTIuNDgtNS01LjUtNXptMy42NCA3LjQ4Yy0uMjUuNDQtLjQ3LjgtLjY3IDEuMTEtLjg2IDEuNDEtMS4yNSAyLjA2LTEuNDUgMy4yMy0uMDIuMDUtLjAyLjExLS4wMi4xN0g1YzAtLjA2IDAtLjEzLS4wMi0uMTctLjItMS4xNy0uNTktMS44My0xLjQ1LTMuMjMtLjItLjMxLS40Mi0uNjctLjY3LTEuMTFDMi40NCA2Ljc4IDIgNS42NSAyIDVjMC0yLjIgMi4wMi00IDQuNS00IDEuMjIgMCAyLjM2LjQyIDMuMjIgMS4xOUMxMC41NSAyLjk0IDExIDMuOTQgMTEgNWMwIC42Ni0uNDQgMS43OC0uODYgMi40OHpNNCAxNGg1Yy0uMjMgMS4xNC0xLjMgMi0yLjUgMnMtMi4yNy0uODYtMi41LTJ6IiAvPjwvc3ZnPg==)</span>tip

</div>

<div class="admonitionContent_BuS1">

Use *compile* and *stream* plugins when you want your plugin to work with any transport. Transport plugins are only needed when you want to define a completely custom delivery mechanism.

</div>

</div>

## Writing a plugin<a href="#writing-a-plugin" class="hash-link" aria-label="Direct link to Writing a plugin" translate="no" title="Direct link to Writing a plugin">​</a>

A plugin is a function that receives a mail object and a callback. Here is an example that automatically generates a plain-text version of your email when only HTML is provided:

<div class="language-js codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` js
// CommonJS module format
module.exports = function myCompilePlugin(mail, callback) {
  // The mail object contains a `data` property with your message options
  // You can read and modify these properties before the message is compiled

  if (!mail.data.text && mail.data.html) {
    // Generate plain-text from HTML using the html-to-text package
    mail.data.text = require("html-to-text").htmlToText(mail.data.html);
  }

  // Always call the callback when done
  // Pass no arguments for success, or pass an Error to abort sending
  callback();
};
```

</div>

</div>

To use the plugin, register it on a transport instance with the `use()` method:

<div class="language-js codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` js
const nodemailer = require("nodemailer");
const transport = nodemailer.createTransport({ sendmail: true });

// Register a compile plugin - it will run before MIME generation
transport.use("compile", require("./myCompilePlugin"));
```

</div>

</div>

### Error handling<a href="#error-handling" class="hash-link" aria-label="Direct link to Error handling" translate="no" title="Direct link to Error handling">​</a>

If your plugin encounters a problem that should prevent the message from being sent, pass an `Error` object to the callback:

<div class="language-js codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` js
callback(new Error("Template not found"));
```

</div>

</div>

When you pass an error, the message will **not** be sent. The error will be returned to the caller through the `sendMail()` callback or rejected promise.

## Public plugins<a href="#public-plugins" class="hash-link" aria-label="Direct link to Public plugins" translate="no" title="Direct link to Public plugins">​</a>

Here are some popular community-maintained plugins you can use:

- **express-handlebars** - Render Handlebars templates using your Express application's views directory.
  <a href="https://github.com/yads/nodemailer-express-handlebars" target="_blank" rel="noopener noreferrer">https://github.com/yads/nodemailer-express-handlebars</a>
- **inline-base64** - Automatically convert inline base64-encoded images in your HTML to proper CID attachments.
  <a href="https://github.com/mixmaxhq/nodemailer-plugin-inline-base64" target="_blank" rel="noopener noreferrer">https://github.com/mixmaxhq/nodemailer-plugin-inline-base64</a>
- **html-to-text** - Automatically generate a plain-text version of your email when only HTML content is provided.
  <a href="https://github.com/andris9/nodemailer-html-to-text" target="_blank" rel="noopener noreferrer">https://github.com/andris9/nodemailer-html-to-text</a>

Looking for something else? Try <a href="https://www.npmjs.com/search?q=keywords:nodemailer%20plugin" target="_blank" rel="noopener noreferrer">searching npm for "nodemailer plugin"</a>.

------------------------------------------------------------------------

Need more control? See **[Creating plugins](/plugins/create)** for a detailed guide on the plugin API.

</div>

<a href="/guides/using-gmail" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

Using Gmail

</div>

<a href="/plugins/create" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

Create plugins

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#writing-a-plugin" class="table-of-contents__link toc-highlight">Writing a plugin</a>
  - <a href="#error-handling" class="table-of-contents__link toc-highlight">Error handling</a>
- <a href="#public-plugins" class="table-of-contents__link toc-highlight">Public plugins</a>

</div>

</div>

</div>

</div>

</div>
