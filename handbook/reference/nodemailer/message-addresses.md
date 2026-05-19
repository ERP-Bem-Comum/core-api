<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <a href="/message" class="breadcrumbs__link"><span>Message configuration</span></a>
- <span class="breadcrumbs__link">Address object</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# Address object

</div>

Nodemailer accepts email addresses in **three interchangeable formats**. You can use any of these formats (or mix them together) in any address field, including `from`, `to`, `cc`, `bcc`, `replyTo`, and `sender`. For a complete list of message fields, see [message configuration](/message).

## 1. Plain email address<a href="#1-plain-email-address" class="hash-link" aria-label="Direct link to 1. Plain email address" translate="no" title="Direct link to 1. Plain email address">​</a>

The simplest format is just the email address as a string:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
"foobar@example.com"
```

</div>

</div>

------------------------------------------------------------------------

## 2. Formatted address (display name + email)<a href="#2-formatted-address-display-name--email" class="hash-link" aria-label="Direct link to 2. Formatted address (display name + email)" translate="no" title="Direct link to 2. Formatted address (display name + email)">​</a>

To include a display name alongside the email address, use the standard email format with angle brackets. Nodemailer fully supports Unicode characters in display names:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
"Ноде Майлер <foobar@example.com>"
```

</div>

</div>

<div class="theme-admonition theme-admonition-tip admonition_xJq3 alert alert--success">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTIgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTYuNSAwQzMuNDggMCAxIDIuMTkgMSA1YzAgLjkyLjU1IDIuMjUgMSAzIDEuMzQgMi4yNSAxLjc4IDIuNzggMiA0djFoNXYtMWMuMjItMS4yMi42Ni0xLjc1IDItNCAuNDUtLjc1IDEtMi4wOCAxLTMgMC0yLjgxLTIuNDgtNS01LjUtNXptMy42NCA3LjQ4Yy0uMjUuNDQtLjQ3LjgtLjY3IDEuMTEtLjg2IDEuNDEtMS4yNSAyLjA2LTEuNDUgMy4yMy0uMDIuMDUtLjAyLjExLS4wMi4xN0g1YzAtLjA2IDAtLjEzLS4wMi0uMTctLjItMS4xNy0uNTktMS44My0xLjQ1LTMuMjMtLjItLjMxLS40Mi0uNjctLjY3LTEuMTFDMi40NCA2Ljc4IDIgNS42NSAyIDVjMC0yLjIgMi4wMi00IDQuNS00IDEuMjIgMCAyLjM2LjQyIDMuMjIgMS4xOUMxMC41NSAyLjk0IDExIDMuOTQgMTEgNWMwIC42Ni0uNDQgMS43OC0uODYgMi40OHpNNCAxNGg1Yy0uMjMgMS4xNC0xLjMgMi0yLjUgMnMtMi4yNy0uODYtMi41LTJ6IiAvPjwvc3ZnPg==)</span>Handling commas and special characters

</div>

<div class="admonitionContent_BuS1">

Since address fields use commas to separate multiple recipients, you must wrap display names containing commas (or other special characters like semicolons) in double quotes:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
'"Майлер, Ноде" <foobar@example.com>'
```

</div>

</div>

Without the double quotes, Nodemailer would incorrectly interpret the comma as a separator between two addresses.

</div>

</div>

------------------------------------------------------------------------

## 3. Address object<a href="#3-address-object" class="hash-link" aria-label="Direct link to 3. Address object" translate="no" title="Direct link to 3. Address object">​</a>

For the most reliable approach, pass a plain JavaScript object with `name` and `address` properties. This lets Nodemailer handle all the escaping and formatting automatically, so you do not need to worry about special characters:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
{
  name: "Майлер, Ноде",
  address: "foobar@example.com"
}
```

</div>

</div>

Both properties are optional. If you omit `name`, only the email address is used. If you omit `address`, the entry is ignored.

------------------------------------------------------------------------

## Mixing formats and using arrays<a href="#mixing-formats-and-using-arrays" class="hash-link" aria-label="Direct link to Mixing formats and using arrays" translate="no" title="Direct link to Mixing formats and using arrays">​</a>

Each address field accepts any of the following input types:

- **A single address** in any of the three formats described above
- **A comma-separated string** containing multiple addresses
- **An array** of addresses (each element can be any format)
- **A mixed array** combining comma-separated strings and address objects

This flexibility allows you to structure your address data in whatever way is most convenient for your application.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const message = {
  // Single formatted address string
  from: '"Example Sender" <sender@example.com>',

  // Comma-separated string with multiple recipients
  to: 'foobar@example.com, "Ноде Майлер" <bar@example.com>, "Name, User" <baz@example.com>',

  // Array of address strings
  cc: [
    "first@example.com",
    '"Ноде Майлер" <second@example.com>',
    '"Name, User" <third@example.com>'
  ],

  // Mixed array: strings and address objects together
  bcc: [
    "hidden@example.com",
    {
      name: "Майлер, Ноде",
      address: "another@example.com"
    }
  ]
};
```

</div>

</div>

------------------------------------------------------------------------

## Internationalized email addresses<a href="#internationalized-email-addresses" class="hash-link" aria-label="Direct link to Internationalized email addresses" translate="no" title="Direct link to Internationalized email addresses">​</a>

Nodemailer supports internationalized domain names (IDNs) that contain non-ASCII characters. When you provide a Unicode domain, Nodemailer automatically converts it to the ASCII-compatible <a href="https://en.wikipedia.org/wiki/Punycode" target="_blank" rel="noopener noreferrer">Punycode</a> encoding required by the email protocol:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
"андрис@уайлддак.орг"
// Nodemailer converts the domain to punycode: андрис@xn--80aalaxjd5d.xn--c1avg
```

</div>

</div>

### Unicode usernames (EAI/SMTPUTF8)<a href="#unicode-usernames-eaismtputf8" class="hash-link" aria-label="Direct link to Unicode usernames (EAI/SMTPUTF8)" translate="no" title="Direct link to Unicode usernames (EAI/SMTPUTF8)">​</a>

Email addresses with non-ASCII characters in the local part (the username before the `@` symbol) require the receiving server to support the SMTPUTF8 extension. Nodemailer automatically detects when internationalized usernames are used and sends the `SMTPUTF8` parameter with the `MAIL FROM` command. For more details about SMTP envelope handling, see [SMTP envelope](/smtp/envelope).

If the server does not advertise SMTPUTF8 support, the message will be rejected with an `EENVELOPE` error to prevent delivery failures.

------------------------------------------------------------------------

## Complete example<a href="#complete-example" class="hash-link" aria-label="Direct link to Complete example" translate="no" title="Direct link to Complete example">​</a>

The following example demonstrates how to send an email using multiple address formats together. For more information about configuring SMTP transport options, see [SMTP transport](/smtp).

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const nodemailer = require("nodemailer");

async function sendEmail() {
  // Create a transport with your SMTP server settings
  const transport = nodemailer.createTransport({
    host: "smtp.example.com",
    port: 587,
    auth: {
      user: "smtp-user",
      pass: "smtp-pass"
    }
  });

  // Send an email using mixed address formats
  await transport.sendMail({
    from: '"Example Sender" <sender@example.com>',
    to: [
      "recipient@example.com",                              // Plain address
      { name: "Nodemailer User", address: "user@example.com" }  // Address object
    ],
    subject: "Hello from Nodemailer",
    text: "This demonstrates the different address formats."
  });
}

sendEmail().catch(console.error);
```

</div>

</div>

</div>

<a href="/message" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

Message configuration

</div>

<a href="/message/attachments" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

Attachments

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#1-plain-email-address" class="table-of-contents__link toc-highlight">1. Plain email address</a>
- <a href="#2-formatted-address-display-name--email" class="table-of-contents__link toc-highlight">2. Formatted address (display name + email)</a>
- <a href="#3-address-object" class="table-of-contents__link toc-highlight">3. Address object</a>
- <a href="#mixing-formats-and-using-arrays" class="table-of-contents__link toc-highlight">Mixing formats and using arrays</a>
- <a href="#internationalized-email-addresses" class="table-of-contents__link toc-highlight">Internationalized email addresses</a>
  - <a href="#unicode-usernames-eaismtputf8" class="table-of-contents__link toc-highlight">Unicode usernames (EAI/SMTPUTF8)</a>
- <a href="#complete-example" class="table-of-contents__link toc-highlight">Complete example</a>

</div>

</div>

</div>

</div>

</div>
