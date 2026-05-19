<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <a href="/guides" class="breadcrumbs__link"><span>Guides</span></a>
- <span class="breadcrumbs__link">Using Gmail</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# Using Gmail

</div>

> **TL;DR** For new projects, use **OAuth 2.0** (or an App Password if you already have Google 2-Step Verification enabled). Google permanently disabled "Less Secure App" access on **May 30, 2022**.

Gmail is often the quickest way to send a test email with Nodemailer, but it is *not* recommended for production workloads. Gmail is designed for individual users, not automated services, and Google's security systems actively monitor for suspicious login activity. When Google detects behavior that resembles account hijacking (for example, your production server connecting from a different country than your usual location), it will block the SMTP connection without delivering the message.

This guide covers the supported authentication methods, Gmail's sending limits, and common issues developers encounter.

------------------------------------------------------------------------

## 1. Choose an authentication method<a href="#1-choose-an-authentication-method" class="hash-link" aria-label="Direct link to 1. Choose an authentication method" translate="no" title="Direct link to 1. Choose an authentication method">​</a>

| Method | When to use | Status |
|----|----|----|
| **OAuth 2.0** | Recommended for all new integrations. Works with personal Gmail accounts **and** Google Workspace. | Supported |
| **App Password** | Works only when **2-Step Verification** is enabled on the account. Simpler than OAuth 2.0 for small internal tools. | Supported |
| "Less Secure App" Password | A deprecated mechanism that allowed basic authentication logins. | Disabled since May 30, 2022 |

### OAuth 2.0 (recommended)<a href="#oauth-20-recommended" class="hash-link" aria-label="Direct link to OAuth 2.0 (recommended)" translate="no" title="Direct link to OAuth 2.0 (recommended)">​</a>

OAuth 2.0 is the most secure and reliable method for authenticating with Gmail. Instead of storing passwords, you complete a one-time authorization flow and store a `refreshToken`. Nodemailer then automatically refreshes access tokens as needed.

<div class="language-js codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail", // Shortcut for Gmail's SMTP settings - see Well-Known Services
  auth: {
    type: "OAuth2",
    user: "me@gmail.com",
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  },
});
```

</div>

</div>

The `service: "gmail"` option is a convenient shortcut that automatically configures Gmail's SMTP server settings. See [Well-Known Services](/smtp/well-known-services) for more details and a full list of supported providers.

<div class="theme-admonition theme-admonition-info admonition_xJq3 alert alert--info">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTQgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTcgMi4zYzMuMTQgMCA1LjcgMi41NiA1LjcgNS43cy0yLjU2IDUuNy01LjcgNS43QTUuNzEgNS43MSAwIDAgMSAxLjMgOGMwLTMuMTQgMi41Ni01LjcgNS43LTUuN3pNNyAxQzMuMTQgMSAwIDQuMTQgMCA4czMuMTQgNyA3IDcgNy0zLjE0IDctNy0zLjE0LTctNy03em0xIDNINnY1aDJWNHptMCA2SDZ2Mmgydi0yeiIgLz48L3N2Zz4=)</span>Google Workspace SMTP Relay

</div>

<div class="admonitionContent_BuS1">

If you are using **Google Workspace** and need to send from custom addresses without Gmail rewriting the `From:` header, use the dedicated `"GmailWorkspace"` service instead. This connects to `smtp-relay.gmail.com`, which supports sending as any address in your Workspace domain. See Google's <a href="https://support.google.com/a/answer/176600" target="_blank" rel="noopener noreferrer">SMTP relay service documentation</a> for setup instructions.

<div class="language-js codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` js
const transporter = nodemailer.createTransport({
  service: "GmailWorkspace",
  auth: {
    user: "me@mydomain.com",
    pass: process.env.GOOGLE_APP_PASSWORD,
  },
});
```

</div>

</div>

</div>

</div>

For a complete walkthrough on setting up OAuth 2.0 credentials, including how to obtain your client ID, client secret, and refresh token, see the dedicated guide: [SMTP / OAuth 2.0](/smtp/oauth2).

### App Password (requires 2-Step Verification)<a href="#app-password-requires-2-step-verification" class="hash-link" aria-label="Direct link to App Password (requires 2-Step Verification)" translate="no" title="Direct link to App Password (requires 2-Step Verification)">​</a>

If you have 2-Step Verification enabled on your Google account, you can generate a 16-character App Password specifically for Nodemailer. This password works like a regular SMTP password but is separate from your main Google account password.

To create an App Password:

1.  Go to your <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer">Google Account Security settings</a>
2.  Under "Signing in to Google," select **App Passwords** (you must have 2-Step Verification enabled to see this option)
3.  Generate a new App Password for "Mail"
4.  Copy the 16-character password and use it in your configuration

<div class="language-js codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` js
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "me@gmail.com",
    pass: process.env.GOOGLE_APP_PASSWORD, // The 16-character App Password
  },
});
```

</div>

</div>

App Passwords bypass most of Google's additional security checks. However, Google may still block connections from unusual locations or suspicious IP address ranges.

------------------------------------------------------------------------

## 2. Gmail quirks to keep in mind<a href="#2-gmail-quirks-to-keep-in-mind" class="hash-link" aria-label="Direct link to 2. Gmail quirks to keep in mind" translate="no" title="Direct link to 2. Gmail quirks to keep in mind">​</a>

### Gmail rewrites the From: header<a href="#gmail-rewrites-the-from-header" class="hash-link" aria-label="Direct link to Gmail rewrites the From: header" translate="no" title="Direct link to Gmail rewrites the From: header">​</a>

Gmail *always* overwrites the sender address with the authenticated account's email address. If you authenticate as `foo@example.com` but specify `bar@example.com` in the `from` field, Gmail will silently replace it with `foo@example.com`.

If you need to send from a different address, you have two options:

- Set up an **alias** in your Gmail settings
- Configure a **Send As** address in Google Workspace

### Daily sending limits<a href="#daily-sending-limits" class="hash-link" aria-label="Direct link to Daily sending limits" translate="no" title="Direct link to Daily sending limits">​</a>

Gmail enforces strict limits on the number of recipients you can email within a 24-hour period:

- **Personal Gmail accounts:** Up to **500** recipients per rolling 24-hour period
- **Google Workspace accounts:** Up to **2,000** recipients per rolling 24-hour period

Each recipient counts individually, regardless of how many messages you send. For example, a single email with one To: address and one Cc: address counts as **2 recipients** toward your limit.

If you exceed these limits, Gmail returns SMTP error **454 4.7.0** ("Too many recipients"). You must wait for the quota to reset before sending more emails.

------------------------------------------------------------------------

## 3. Production alternatives<a href="#3-production-alternatives" class="hash-link" aria-label="Direct link to 3. Production alternatives" translate="no" title="Direct link to 3. Production alternatives">​</a>

For reliable email delivery at higher volumes, consider switching to a dedicated email service provider such as SendGrid, Postmark, [Amazon SES](/transports/ses), or Mailgun. These services are designed for automated sending and offer several advantages over Gmail:

- No aggressive login security that blocks legitimate server connections
- Higher sending limits (many offer free tiers of 100-300 emails per day)
- No automatic rewriting of sender addresses
- Better deliverability monitoring and analytics

------------------------------------------------------------------------

## Troubleshooting checklist<a href="#troubleshooting-checklist" class="hash-link" aria-label="Direct link to Troubleshooting checklist" translate="no" title="Direct link to Troubleshooting checklist">​</a>

If your emails are not being sent, work through these steps:

1.  **Check Google's security alerts.** Visit the <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer">Google Account "Security &gt; Recent activity" page</a> to see if Google blocked a login attempt from your server.

2.  **Verify your OAuth 2.0 setup.** If using OAuth 2.0, confirm that:

    - Your `refreshToken` has not expired or been revoked
    - Your OAuth consent screen is set to "Production" status (not "Testing")
    - The Google Cloud project has not been deleted or suspended

3.  **Confirm your App Password is valid.** If using an App Password:

    - Verify that 2-Step Verification is still enabled on the account
    - Check that the App Password has not been revoked
    - Try generating a new App Password if problems persist

4.  **Synchronize your server clock.** OAuth tokens are time-sensitive. Ensure your server's system clock is accurate (consider using NTP for automatic synchronization).

5.  **Test the SMTP connection manually.** Try connecting to Gmail's SMTP server directly to isolate whether the issue is with Nodemailer or the network/authentication:

    <div class="language-bash codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

    <div class="codeBlockContent_QJqH">

    ``` bash
    openssl s_client -connect smtp.gmail.com:465
    ```

    </div>

    </div>

    If this connection fails, the problem is likely with your network configuration or Google blocking your IP address.

</div>

<a href="/guides/testing-with-ethereal" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

Testing with Ethereal

</div>

<a href="/plugins" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

Plugins

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#1-choose-an-authentication-method" class="table-of-contents__link toc-highlight">1. Choose an authentication method</a>
  - <a href="#oauth-20-recommended" class="table-of-contents__link toc-highlight">OAuth 2.0 (recommended)</a>
  - <a href="#app-password-requires-2-step-verification" class="table-of-contents__link toc-highlight">App Password (requires 2-Step Verification)</a>
- <a href="#2-gmail-quirks-to-keep-in-mind" class="table-of-contents__link toc-highlight">2. Gmail quirks to keep in mind</a>
  - <a href="#gmail-rewrites-the-from-header" class="table-of-contents__link toc-highlight">Gmail rewrites the From: header</a>
  - <a href="#daily-sending-limits" class="table-of-contents__link toc-highlight">Daily sending limits</a>
- <a href="#3-production-alternatives" class="table-of-contents__link toc-highlight">3. Production alternatives</a>
- <a href="#troubleshooting-checklist" class="table-of-contents__link toc-highlight">Troubleshooting checklist</a>

</div>

</div>

</div>

</div>

</div>
