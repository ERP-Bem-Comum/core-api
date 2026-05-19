<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <a href="/transports" class="breadcrumbs__link"><span>Transports</span></a>
- <span class="breadcrumbs__link">SES transport</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# SES transport

</div>

The Nodemailer **SES transport** allows you to send emails through **Amazon Simple Email Service (SES)** using the official AWS SDK v3 package <a href="https://www.npmjs.com/package/@aws-sdk/client-sesv2" target="_blank" rel="noopener noreferrer">@aws-sdk/client-sesv2</a>.
It acts as a wrapper around the <a href="https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/" target="_blank" rel="noopener noreferrer"><code>SendEmailCommand</code></a> while letting you use the familiar `transporter.sendMail()` API you already know from Nodemailer.

For an overview of all available transports, see the [transports documentation](/transports/).

The AWS SES SDK is not included with Nodemailer, so you need to install it separately:

<div class="language-bash codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` bash
npm install @aws-sdk/client-sesv2
```

</div>

</div>

## Quick start<a href="#quick-start" class="hash-link" aria-label="Direct link to Quick start" translate="no" title="Direct link to Quick start">​</a>

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const nodemailer = require("nodemailer");
const { SESv2Client, SendEmailCommand } = require("@aws-sdk/client-sesv2");

// 1. Create an AWS SES client
//    If you omit credentials, the SDK uses the default credential chain
//    (environment variables, shared credentials file, IAM role, etc.)
const sesClient = new SESv2Client({ region: "us-east-1" });

// 2. Create a Nodemailer transport configured to use SES
const transporter = nodemailer.createTransport({
  SES: { sesClient, SendEmailCommand },
});

// 3. Send the message
const info = await transporter.sendMail({
  from: "sender@example.com",
  to: "recipient@example.com",
  subject: "Hello from Nodemailer + SES",
  text: "I hope this message gets sent!",
  // You can pass additional SES-specific options under the `ses` key:
  ses: {
    ConfigurationSetName: "my-config-set",
    EmailTags: [{ Name: "tag_name", Value: "tag_value" }],
  },
});

console.log(info.envelope); // { from: "sender@example.com", to: ["recipient@example.com"] }
console.log(info.messageId); // The SES Message ID
```

</div>

</div>

<div class="theme-admonition theme-admonition-tip admonition_xJq3 alert alert--success">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTIgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTYuNSAwQzMuNDggMCAxIDIuMTkgMSA1YzAgLjkyLjU1IDIuMjUgMSAzIDEuMzQgMi4yNSAxLjc4IDIuNzggMiA0djFoNXYtMWMuMjItMS4yMi42Ni0xLjc1IDItNCAuNDUtLjc1IDEtMi4wOCAxLTMgMC0yLjgxLTIuNDgtNS01LjUtNXptMy42NCA3LjQ4Yy0uMjUuNDQtLjQ3LjgtLjY3IDEuMTEtLjg2IDEuNDEtMS4yNSAyLjA2LTEuNDUgMy4yMy0uMDIuMDUtLjAyLjExLS4wMi4xN0g1YzAtLjA2IDAtLjEzLS4wMi0uMTctLjItMS4xNy0uNTktMS44My0xLjQ1LTMuMjMtLjItLjMxLS40Mi0uNjctLjY3LTEuMTFDMi40NCA2Ljc4IDIgNS42NSAyIDVjMC0yLjIgMi4wMi00IDQuNS00IDEuMjIgMCAyLjM2LjQyIDMuMjIgMS4xOUMxMC41NSAyLjk0IDExIDMuOTQgMTEgNWMwIC42Ni0uNDQgMS43OC0uODYgMi40OHpNNCAxNGg1Yy0uMjMgMS4xNC0xLjMgMi0yLjUgMnMtMi4yNy0uODYtMi41LTJ6IiAvPjwvc3ZnPg==)</span>tip

</div>

<div class="admonitionContent_BuS1">

You can also use the callback style if you prefer: `transporter.sendMail(mailOptions, callback)`.

</div>

</div>

## Transport options<a href="#transport-options" class="hash-link" aria-label="Direct link to Transport options" translate="no" title="Direct link to Transport options">​</a>

When calling `createTransport()`, pass an object with an `SES` property. This `SES` object must contain the following **required** keys:

| Key | Type | Description |
|----|----|----|
| `sesClient` | `SESv2Client` | An initialized AWS SDK v3 SES client instance |
| `SendEmailCommand` | `SendEmailCommand` | The `SendEmailCommand` class from **@aws-sdk/client-sesv2** |

<div class="theme-admonition theme-admonition-warning admonition_xJq3 alert alert--warning">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTYgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTguODkzIDEuNWMtLjE4My0uMzEtLjUyLS41LS44ODctLjVzLS43MDMuMTktLjg4Ni41TC4xMzggMTMuNDk5YS45OC45OCAwIDAgMCAwIDEuMDAxYy4xOTMuMzEuNTMuNTAxLjg4Ni41MDFoMTMuOTY0Yy4zNjcgMCAuNzA0LS4xOS44NzctLjVhMS4wMyAxLjAzIDAgMCAwIC4wMS0xLjAwMkw4Ljg5MyAxLjV6bS4xMzMgMTEuNDk3SDYuOTg3di0yLjAwM2gyLjAzOXYyLjAwM3ptMC0zLjAwNEg2Ljk4N1Y1Ljk4N2gyLjAzOXY0LjAwNnoiIC8+PC9zdmc+)</span>Property names matter

</div>

<div class="admonitionContent_BuS1">

The property **must** be named exactly `sesClient` (not `client`, `ses`, or any other name). If you store your client in a variable with a different name, use explicit property syntax to rename it:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const myClient = new SESv2Client({ region: "us-east-1" });
const transporter = nodemailer.createTransport({
  SES: { sesClient: myClient, SendEmailCommand }, // rename myClient to sesClient
});
```

</div>

</div>

</div>

</div>

## Message-level options<a href="#message-level-options" class="hash-link" aria-label="Direct link to Message-level options" translate="no" title="Direct link to Message-level options">​</a>

When calling `sendMail()`, you can include an optional **ses** property in your [mail options](/message) object.
Any properties you add to this object are passed directly to the AWS `SendEmailCommand`, allowing you to use SES-specific features such as `EmailTags`, `ConfigurationSetName`, `FeedbackForwardingEmailAddress`, and more. See the <a href="https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sesv2/command/SendEmailCommand/" target="_blank" rel="noopener noreferrer">AWS SES documentation</a> for all available options.

## Response object<a href="#response-object" class="hash-link" aria-label="Direct link to Response object" translate="no" title="Direct link to Response object">​</a>

When the email is sent successfully, the promise resolves (or the callback receives) an object with the following properties:

| Property | Description |
|----|----|
| `envelope` | An object containing `from` (string) and `to` (array of strings) representing the email envelope |
| `messageId` | The Message ID returned by SES, formatted as a standard Message-ID header value |
| `response` | The raw Message ID string as returned by SES (without angle brackets or domain suffix) |
| `raw` | A `Buffer` containing the complete raw RFC 822 message that was sent to SES |

<div class="theme-admonition theme-admonition-note admonition_xJq3 alert alert--secondary">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTQgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTYuMyA1LjY5YS45NDIuOTQyIDAgMCAxLS4yOC0uN2MwLS4yOC4wOS0uNTIuMjgtLjcuMTktLjE4LjQyLS4yOC43LS4yOC4yOCAwIC41Mi4wOS43LjI4LjE4LjE5LjI4LjQyLjI4LjcgMCAuMjgtLjA5LjUyLS4yOC43YTEgMSAwIDAgMS0uNy4zYy0uMjggMC0uNTItLjExLS43LS4zek04IDcuOTljLS4wMi0uMjUtLjExLS40OC0uMzEtLjY5LS4yLS4xOS0uNDItLjMtLjY5LS4zMUg2Yy0uMjcuMDItLjQ4LjEzLS42OS4zMS0uMi4yLS4zLjQ0LS4zMS42OWgxdjNjLjAyLjI3LjExLjUuMzEuNjkuMi4yLjQyLjMxLjY5LjMxaDFjLjI3IDAgLjQ4LS4xMS42OS0uMzEuMi0uMTkuMy0uNDIuMzEtLjY5SDhWNy45OHYuMDF6TTcgMi4zYy0zLjE0IDAtNS43IDIuNTQtNS43IDUuNjggMCAzLjE0IDIuNTYgNS43IDUuNyA1LjdzNS43LTIuNTUgNS43LTUuN2MwLTMuMTUtMi41Ni01LjY5LTUuNy01LjY5di4wMXpNNyAuOThjMy44NiAwIDcgMy4xNCA3IDdzLTMuMTQgNy03IDctNy0zLjEyLTctNyAzLjE0LTcgNy03eiIgLz48L3N2Zz4=)</span>Memory usage

</div>

<div class="admonitionContent_BuS1">

The entire message (including attachments) is buffered in memory before being sent to SES. For messages with very large attachments, ensure your application has sufficient memory available.

</div>

</div>

## Rate limiting<a href="#rate-limiting" class="hash-link" aria-label="Direct link to Rate limiting" translate="no" title="Direct link to Rate limiting">​</a>

The SES transport does **not** include built-in rate limiting, queuing, or concurrency controls. Each `sendMail()` call immediately initiates a send operation to AWS.

If you need to send bulk emails, you must implement your own rate limiting to stay within your <a href="https://docs.aws.amazon.com/ses/latest/dg/manage-sending-quotas.html" target="_blank" rel="noopener noreferrer">SES sending limits</a>. The AWS SDK v3 handles automatic retries with exponential backoff for transient errors.

<div class="theme-admonition theme-admonition-tip admonition_xJq3 alert alert--success">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTIgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTYuNSAwQzMuNDggMCAxIDIuMTkgMSA1YzAgLjkyLjU1IDIuMjUgMSAzIDEuMzQgMi4yNSAxLjc4IDIuNzggMiA0djFoNXYtMWMuMjItMS4yMi42Ni0xLjc1IDItNCAuNDUtLjc1IDEtMi4wOCAxLTMgMC0yLjgxLTIuNDgtNS01LjUtNXptMy42NCA3LjQ4Yy0uMjUuNDQtLjQ3LjgtLjY3IDEuMTEtLjg2IDEuNDEtMS4yNSAyLjA2LTEuNDUgMy4yMy0uMDIuMDUtLjAyLjExLS4wMi4xN0g1YzAtLjA2IDAtLjEzLS4wMi0uMTctLjItMS4xNy0uNTktMS44My0xLjQ1LTMuMjMtLjItLjMxLS40Mi0uNjctLjY3LTEuMTFDMi40NCA2Ljc4IDIgNS42NSAyIDVjMC0yLjIgMi4wMi00IDQuNS00IDEuMjIgMCAyLjM2LjQyIDMuMjIgMS4xOUMxMC41NSAyLjk0IDExIDMuOTQgMTEgNWMwIC42Ni0uNDQgMS43OC0uODYgMi40OHpNNCAxNGg1Yy0uMjMgMS4xNC0xLjMgMi0yLjUgMnMtMi4yNy0uODYtMi41LTJ6IiAvPjwvc3ZnPg==)</span>tip

</div>

<div class="admonitionContent_BuS1">

For high-volume sending, consider using a job queue (such as Bull, Bee-Queue, or AWS SQS) to manage send operations and respect SES rate limits.

</div>

</div>

## DKIM signing<a href="#dkim-signing" class="hash-link" aria-label="Direct link to DKIM signing" translate="no" title="Direct link to DKIM signing">​</a>

When using [DKIM signing](/dkim) with the SES transport, Nodemailer automatically excludes the `Date` and `Message-ID` headers from the DKIM signature. This is necessary because SES may modify these headers, which would otherwise invalidate the signature.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const transporter = nodemailer.createTransport({
  SES: { sesClient, SendEmailCommand },
  dkim: {
    domainName: "example.com",
    keySelector: "mail",
    privateKey: fs.readFileSync("dkim-private.pem", "utf8"),
  },
});
```

</div>

</div>

## Troubleshooting<a href="#troubleshooting" class="hash-link" aria-label="Direct link to Troubleshooting" translate="no" title="Direct link to Troubleshooting">​</a>

### "User is not authorized to perform: ses:SendRawEmail"<a href="#user-is-not-authorized-to-perform-ses" class="hash-link" aria-label="Direct link to user-is-not-authorized-to-perform-ses" translate="no" title="Direct link to user-is-not-authorized-to-perform-ses">​</a>

This error means your AWS credentials lack the required permissions. To resolve it:

1.  Verify that the IAM user or role associated with your credentials has the **ses:SendRawEmail** permission. See the [minimal IAM policy example](#example-2) below.
2.  Ensure the **From** address (or its entire domain) is verified in the <a href="https://console.aws.amazon.com/ses/" target="_blank" rel="noopener noreferrer">SES console</a>. SES requires sender verification before you can send emails.
3.  If your SES account is still in sandbox mode, you must also verify each recipient address. Request production access to remove this restriction.
4.  In rare cases, AWS access keys containing special characters have caused authentication failures. If everything else looks correct, try regenerating your access keys.

### "Cannot find module '@aws-sdk/client-sesv2'"<a href="#cannot-find-module-aws-sdkclient-sesv2" class="hash-link" aria-label="Direct link to &quot;Cannot find module &#39;@aws-sdk/client-sesv2&#39;&quot;" translate="no" title="Direct link to &quot;Cannot find module &#39;@aws-sdk/client-sesv2&#39;&quot;">​</a>

The AWS SES SDK is not bundled with Nodemailer. You need to install it as a separate dependency:

<div class="language-bash codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` bash
npm install @aws-sdk/client-sesv2
```

</div>

</div>

### Using the verify() method with SES<a href="#using-the-verify-method-with-ses" class="hash-link" aria-label="Direct link to Using the verify() method with SES" translate="no" title="Direct link to Using the verify() method with SES">​</a>

The SES transport supports the `transporter.verify()` method to validate your configuration. Unlike [SMTP transports](/smtp), which test the actual connection, the SES verify method works by attempting to send an invalid test message. If SES responds with an `InvalidParameterValue` or `MessageRejected` error, the verification is considered successful because it confirms your credentials and configuration are correct.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
// Verify SES configuration
const isValid = await transporter.verify();
console.log("SES configuration is valid:", isValid);
```

</div>

</div>

## Examples<a href="#examples" class="hash-link" aria-label="Direct link to Examples" translate="no" title="Direct link to Examples">​</a>

### 1. Send a message<a href="#example-1" class="hash-link" aria-label="Direct link to 1. Send a message" translate="no" title="Direct link to 1. Send a message">​</a>

This example shows how to send an email using the callback style, which is useful when you are not using async/await:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const nodemailer = require("nodemailer");
const { SESv2Client, SendEmailCommand } = require("@aws-sdk/client-sesv2");

// Create the SES client using the AWS_REGION environment variable
const sesClient = new SESv2Client({ region: process.env.AWS_REGION });

// Create the Nodemailer transport
const transporter = nodemailer.createTransport({
  SES: { sesClient, SendEmailCommand },
});

// Send the email
transporter.sendMail(
  {
    from: "sender@example.com",
    to: ["recipient@example.com"],
    subject: "Message via SES transport",
    text: "I hope this message gets sent!",
    ses: {
      // Add tags for tracking and analytics
      EmailTags: [{ Name: "tag_name", Value: "tag_value" }],
    },
  },
  (err, info) => {
    if (err) {
      console.error("Failed to send email:", err);
      return;
    }
    console.log("Email sent successfully!");
    console.log("Envelope:", info.envelope);
    console.log("Message ID:", info.messageId);
  }
);
```

</div>

</div>

### 2. Minimal IAM policy<a href="#example-2" class="hash-link" aria-label="Direct link to 2. Minimal IAM policy" translate="no" title="Direct link to 2. Minimal IAM policy">​</a>

Your AWS IAM user or role needs permission to call `ses:SendRawEmail`. Here is the minimal IAM policy required:

<div class="language-json codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ses:SendRawEmail",
      "Resource": "*"
    }
  ]
}
```

</div>

</div>

For production environments, consider restricting the `Resource` to specific verified identities rather than using `"*"`.

</div>

<a href="/transports" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

Transports

</div>

<a href="/transports/sendmail" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

Sendmail transport

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#quick-start" class="table-of-contents__link toc-highlight">Quick start</a>
- <a href="#transport-options" class="table-of-contents__link toc-highlight">Transport options</a>
- <a href="#message-level-options" class="table-of-contents__link toc-highlight">Message-level options</a>
- <a href="#response-object" class="table-of-contents__link toc-highlight">Response object</a>
- <a href="#rate-limiting" class="table-of-contents__link toc-highlight">Rate limiting</a>
- <a href="#dkim-signing" class="table-of-contents__link toc-highlight">DKIM signing</a>
- <a href="#troubleshooting" class="table-of-contents__link toc-highlight">Troubleshooting</a>
  - <a href="#user-is-not-authorized-to-perform-ses" class="table-of-contents__link toc-highlight">"User is not authorized to perform: ses"</a>
  - <a href="#cannot-find-module-aws-sdkclient-sesv2" class="table-of-contents__link toc-highlight">"Cannot find module '@aws-sdk/client-sesv2'"</a>
  - <a href="#using-the-verify-method-with-ses" class="table-of-contents__link toc-highlight">Using the verify() method with SES</a>
- <a href="#examples" class="table-of-contents__link toc-highlight">Examples</a>
  - <a href="#example-1" class="table-of-contents__link toc-highlight">1. Send a message</a>
  - <a href="#example-2" class="table-of-contents__link toc-highlight">2. Minimal IAM policy</a>

</div>

</div>

</div>

</div>

</div>
