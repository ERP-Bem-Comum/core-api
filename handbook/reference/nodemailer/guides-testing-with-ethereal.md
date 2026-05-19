<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <a href="/guides" class="breadcrumbs__link"><span>Guides</span></a>
- <span class="breadcrumbs__link">Testing with Ethereal</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# Testing with Ethereal

</div>

<a href="https://ethereal.email/" target="_blank" rel="noopener noreferrer">Ethereal</a> is a free fake SMTP service designed for testing Nodemailer and other email-sending applications. Messages sent to Ethereal are captured and displayed in a web interface, but they are **never delivered** to real recipients. This makes Ethereal perfect for development, testing, and debugging.

## Why use Ethereal?<a href="#why-use-ethereal" class="hash-link" aria-label="Direct link to Why use Ethereal?" translate="no" title="Direct link to Why use Ethereal?">​</a>

- **No real emails sent** - test freely without worrying about accidentally emailing customers or colleagues
- **Instant preview** - view your emails in a web-based inbox immediately after sending
- **No configuration hassle** - Nodemailer can generate credentials automatically
- **Free to use** - no signup required, reasonable rate limits for development

## Automatic test account<a href="#automatic-test-account" class="hash-link" aria-label="Direct link to Automatic test account" translate="no" title="Direct link to Automatic test account">​</a>

Nodemailer includes built-in support for creating Ethereal test accounts on the fly. Call `nodemailer.createTestAccount()` to generate temporary credentials:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const nodemailer = require("nodemailer");

// Create a test account automatically
const testAccount = await nodemailer.createTestAccount();

// Create a transporter using the test account
const transporter = nodemailer.createTransport({
  host: testAccount.smtp.host,
  port: testAccount.smtp.port,
  secure: testAccount.smtp.secure,
  auth: {
    user: testAccount.user,
    pass: testAccount.pass,
  },
});
```

</div>

</div>

The returned `testAccount` object contains:

| Property      | Description                          |
|---------------|--------------------------------------|
| `user`        | The generated email address          |
| `pass`        | The password for SMTP authentication |
| `smtp.host`   | SMTP server hostname                 |
| `smtp.port`   | SMTP server port                     |
| `smtp.secure` | Whether to use TLS from the start    |
| `web`         | URL to the Ethereal web interface    |

<div class="theme-admonition theme-admonition-tip admonition_xJq3 alert alert--success">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTIgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTYuNSAwQzMuNDggMCAxIDIuMTkgMSA1YzAgLjkyLjU1IDIuMjUgMSAzIDEuMzQgMi4yNSAxLjc4IDIuNzggMiA0djFoNXYtMWMuMjItMS4yMi42Ni0xLjc1IDItNCAuNDUtLjc1IDEtMi4wOCAxLTMgMC0yLjgxLTIuNDgtNS01LjUtNXptMy42NCA3LjQ4Yy0uMjUuNDQtLjQ3LjgtLjY3IDEuMTEtLjg2IDEuNDEtMS4yNSAyLjA2LTEuNDUgMy4yMy0uMDIuMDUtLjAyLjExLS4wMi4xN0g1YzAtLjA2IDAtLjEzLS4wMi0uMTctLjItMS4xNy0uNTktMS44My0xLjQ1LTMuMjMtLjItLjMxLS40Mi0uNjctLjY3LTEuMTFDMi40NCA2Ljc4IDIgNS42NSAyIDVjMC0yLjIgMi4wMi00IDQuNS00IDEuMjIgMCAyLjM2LjQyIDMuMjIgMS4xOUMxMC41NSAyLjk0IDExIDMuOTQgMTEgNWMwIC42Ni0uNDQgMS43OC0uODYgMi40OHpNNCAxNGg1Yy0uMjMgMS4xNC0xLjMgMi0yLjUgMnMtMi4yNy0uODYtMi41LTJ6IiAvPjwvc3ZnPg==)</span>Reuse credentials

</div>

<div class="admonitionContent_BuS1">

Each call to `createTestAccount()` generates a new account. If you want to view all your test emails in one inbox, save the credentials and reuse them across test runs.

</div>

</div>

## Preview sent messages<a href="#preview-sent-messages" class="hash-link" aria-label="Direct link to Preview sent messages" translate="no" title="Direct link to Preview sent messages">​</a>

After sending an email through Ethereal, use `nodemailer.getTestMessageUrl(info)` to get a direct link to view the message in your browser:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const info = await transporter.sendMail({
  from: '"Test Sender" <test@example.com>',
  to: "recipient@example.com",
  subject: "Test Email",
  text: "This is a test email sent via Ethereal!",
  html: "<p>This is a <b>test email</b> sent via Ethereal!</p>",
});

console.log("Message sent: %s", info.messageId);

// Get the Ethereal URL to preview this email
const previewUrl = nodemailer.getTestMessageUrl(info);
console.log("Preview URL: %s", previewUrl);
// Output: https://ethereal.email/message/...
```

</div>

</div>

Open the preview URL in your browser to see exactly how your email looks, including:

- Headers (From, To, Subject, Date, etc.)
- Plain text and HTML body
- Attachments
- Raw message source

## Complete example<a href="#complete-example" class="hash-link" aria-label="Direct link to Complete example" translate="no" title="Direct link to Complete example">​</a>

Here is a complete example that creates a test account, sends an email, and outputs a preview link:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const nodemailer = require("nodemailer");

async function sendTestEmail() {
  // Generate a test account
  const testAccount = await nodemailer.createTestAccount();

  console.log("Test account created:");
  console.log("  User: %s", testAccount.user);
  console.log("  Pass: %s", testAccount.pass);

  // Create a transporter
  const transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  // Send a test message
  const info = await transporter.sendMail({
    from: `"Test App" <${testAccount.user}>`,
    to: "recipient@example.com",
    subject: "Hello from Ethereal!",
    text: "This message was sent using Ethereal.",
    html: "<p>This message was sent using <b>Ethereal</b>.</p>",
  });

  console.log("Message sent: %s", info.messageId);
  console.log("Preview: %s", nodemailer.getTestMessageUrl(info));
}

sendTestEmail().catch(console.error);
```

</div>

</div>

Running this script outputs something like:

<div class="language-text codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` text
Test account created:
  User: abc123@ethereal.email
  Pass: XyZ789AbCdEf
Message sent: <abc123@ethereal.email>
Preview: https://ethereal.email/message/AbCdEfGhIjKl
```

</div>

</div>

## Using the service shortcut<a href="#using-the-service-shortcut" class="hash-link" aria-label="Direct link to Using the service shortcut" translate="no" title="Direct link to Using the service shortcut">​</a>

Instead of using `createTestAccount()`, you can also use the `service: "Ethereal"` shortcut if you have existing Ethereal credentials:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const transporter = nodemailer.createTransport({
  service: "Ethereal",
  auth: {
    user: "existing-user@ethereal.email",
    pass: "existing-password",
  },
});
```

</div>

</div>

## Integrating with test frameworks<a href="#integrating-with-test-frameworks" class="hash-link" aria-label="Direct link to Integrating with test frameworks" translate="no" title="Direct link to Integrating with test frameworks">​</a>

Ethereal works well with testing frameworks like Jest or Mocha. Create a test account once in your test setup and reuse it:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const nodemailer = require("nodemailer");

let transporter;
let testAccount;

beforeAll(async () => {
  testAccount = await nodemailer.createTestAccount();
  transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
});

test("sends welcome email", async () => {
  const info = await transporter.sendMail({
    from: "app@example.com",
    to: "newuser@example.com",
    subject: "Welcome!",
    text: "Thanks for signing up.",
  });

  expect(info.messageId).toBeDefined();
  expect(info.accepted).toContain("newuser@example.com");

  // Optionally log the preview URL for manual inspection
  console.log("Preview:", nodemailer.getTestMessageUrl(info));
});
```

</div>

</div>

## Switch transports based on environment<a href="#switch-transports-based-on-environment" class="hash-link" aria-label="Direct link to Switch transports based on environment" translate="no" title="Direct link to Switch transports based on environment">​</a>

A common pattern is to centralize your transport configuration in one place. This makes it easy to use Ethereal during development and testing while using a production email service in production:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const nodemailer = require("nodemailer");

function createTransport() {
  if (process.env.NODE_ENV === "production") {
    // Production: send real emails
    return nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  // Development/Testing: capture emails with Ethereal
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: process.env.ETHEREAL_USERNAME,
      pass: process.env.ETHEREAL_PASSWORD,
    },
  });
}

module.exports = createTransport;
```

</div>

</div>

For alternative testing approaches, you can also use the [stream transport](/transports/stream) to capture generated messages without any network connection, or run your own local mail server using [smtp-server](/extras/smtp-server).

## Comparison with other testing options<a href="#comparison-with-other-testing-options" class="hash-link" aria-label="Direct link to Comparison with other testing options" translate="no" title="Direct link to Comparison with other testing options">​</a>

| Option | Real delivery | Inbox preview | Setup required |
|----|----|----|----|
| **Ethereal** | No | Yes | None (auto-generated) |
| <a href="https://mailtrap.io/" target="_blank" rel="noopener noreferrer">Mailtrap</a> | No | Yes | Account signup |
| <a href="https://github.com/mailhog/MailHog" target="_blank" rel="noopener noreferrer">Mailhog</a> | No | Yes | Local installation |
| Real SMTP | Yes | N/A | Provider account |

Ethereal is ideal for quick development and testing. For team collaboration or CI/CD pipelines, consider Mailtrap or a self-hosted solution like Mailhog.

</div>

<a href="/guides" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

Guides

</div>

<a href="/guides/using-gmail" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

Using Gmail

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#why-use-ethereal" class="table-of-contents__link toc-highlight">Why use Ethereal?</a>
- <a href="#automatic-test-account" class="table-of-contents__link toc-highlight">Automatic test account</a>
- <a href="#preview-sent-messages" class="table-of-contents__link toc-highlight">Preview sent messages</a>
- <a href="#complete-example" class="table-of-contents__link toc-highlight">Complete example</a>
- <a href="#using-the-service-shortcut" class="table-of-contents__link toc-highlight">Using the service shortcut</a>
- <a href="#integrating-with-test-frameworks" class="table-of-contents__link toc-highlight">Integrating with test frameworks</a>
- <a href="#switch-transports-based-on-environment" class="table-of-contents__link toc-highlight">Switch transports based on environment</a>
- <a href="#comparison-with-other-testing-options" class="table-of-contents__link toc-highlight">Comparison with other testing options</a>

</div>

</div>

</div>

</div>

</div>
