<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <a href="/smtp" class="breadcrumbs__link"><span>SMTP transport</span></a>
- <span class="breadcrumbs__link">OAuth2</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# OAuth2

</div>

OAuth2 allows your application to authenticate with email servers using short-lived access tokens instead of storing passwords. This approach is more secure because tokens are scoped to specific permissions, can be revoked at any time, and can be regenerated if compromised. If a token is leaked, the potential damage is limited and contained, unlike a leaked password which could grant broader access.

1.  [Provider-agnostic OAuth2 authentication](#oauth-token)
2.  [Gmail-specific helpers](#oauth-gmail)

<div class="theme-admonition theme-admonition-tip admonition_xJq3 alert alert--success">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTIgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTYuNSAwQzMuNDggMCAxIDIuMTkgMSA1YzAgLjkyLjU1IDIuMjUgMSAzIDEuMzQgMi4yNSAxLjc4IDIuNzggMiA0djFoNXYtMWMuMjItMS4yMi42Ni0xLjc1IDItNCAuNDUtLjc1IDEtMi4wOCAxLTMgMC0yLjgxLTIuNDgtNS01LjUtNXptMy42NCA3LjQ4Yy0uMjUuNDQtLjQ3LjgtLjY3IDEuMTEtLjg2IDEuNDEtMS4yNSAyLjA2LTEuNDUgMy4yMy0uMDIuMDUtLjAyLjExLS4wMi4xN0g1YzAtLjA2IDAtLjEzLS4wMi0uMTctLjItMS4xNy0uNTktMS44My0xLjQ1LTMuMjMtLjItLjMxLS40Mi0uNjctLjY3LTEuMTFDMi40NCA2Ljc4IDIgNS42NSAyIDVjMC0yLjIgMi4wMi00IDQuNS00IDEuMjIgMCAyLjM2LjQyIDMuMjIgMS4xOUMxMC41NSAyLjk0IDExIDMuOTQgMTEgNWMwIC42Ni0uNDQgMS43OC0uODYgMi40OHpNNCAxNGg1Yy0uMjMgMS4xNC0xLjMgMi0yLjUgMnMtMi4yNy0uODYtMi41LTJ6IiAvPjwvc3ZnPg==)</span>tip

</div>

<div class="admonitionContent_BuS1">

Managing OAuth2 credentials can be complex and error-prone. Consider using **EmailEngine** to handle credential management for you. Once you register an account with EmailEngine, you can configure Nodemailer to send through EmailEngine without any authentication configuration. Learn more <a href="https://emailengine.app/sending-emails?utm_source=nodemailer&amp;utm_campaign=nodemailer&amp;utm_medium=tip-link" target="_blank" rel="noopener noreferrer">here</a>.

</div>

</div>

### Provider-agnostic OAuth2 authentication<a href="#oauth-token" class="hash-link" aria-label="Direct link to Provider-agnostic OAuth2 authentication" translate="no" title="Direct link to Provider-agnostic OAuth2 authentication">​</a>

Use this method when your SMTP server accepts a standard username and access token pair for authentication. This is the simplest OAuth2 approach because you provide a pre-generated token directly to Nodemailer without involving client secrets or refresh tokens.

- **auth** - authentication object

  - **type** - must be set to `'OAuth2'`
  - **user** - the email address to authenticate as (required)
  - **accessToken** - a valid OAuth2 access token (required)
  - **expires** - UNIX timestamp (in milliseconds) indicating when the access token expires (optional)

> **Token scopes**
> Different email providers require different OAuth scopes to allow SMTP access:
>
> - **Gmail** - your token must include the `https://mail.google.com/` scope (see [Using Gmail](/guides/using-gmail) for complete setup instructions)
> - **Outlook** - your token must include the `https://outlook.office.com/SMTP.Send` scope

<div class="language-js codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` js
let transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    type: "OAuth2",
    user: "user@example.com",
    accessToken: "ya29.Xx_XX0xxxxx-xX0X0XxXXxXxXXXxX0x",
  },
});
```

</div>

</div>

<div class="theme-admonition theme-admonition-tip admonition_xJq3 alert alert--success">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTIgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTYuNSAwQzMuNDggMCAxIDIuMTkgMSA1YzAgLjkyLjU1IDIuMjUgMSAzIDEuMzQgMi4yNSAxLjc4IDIuNzggMiA0djFoNXYtMWMuMjItMS4yMi42Ni0xLjc1IDItNCAuNDUtLjc1IDEtMi4wOCAxLTMgMC0yLjgxLTIuNDgtNS01LjUtNXptMy42NCA3LjQ4Yy0uMjUuNDQtLjQ3LjgtLjY3IDEuMTEtLjg2IDEuNDEtMS4yNSAyLjA2LTEuNDUgMy4yMy0uMDIuMDUtLjAyLjExLS4wMi4xN0g1YzAtLjA2IDAtLjEzLS4wMi0uMTctLjItMS4xNy0uNTktMS44My0xLjQ1LTMuMjMtLjItLjMxLS40Mi0uNjctLjY3LTEuMTFDMi40NCA2Ljc4IDIgNS42NSAyIDVjMC0yLjIgMi4wMi00IDQuNS00IDEuMjIgMCAyLjM2LjQyIDMuMjIgMS4xOUMxMC41NSAyLjk0IDExIDMuOTQgMTEgNWMwIC42Ni0uNDQgMS43OC0uODYgMi40OHpNNCAxNGg1Yy0uMjMgMS4xNC0xLjMgMi0yLjUgMnMtMi4yNy0uODYtMi41LTJ6IiAvPjwvc3ZnPg==)</span>tip

</div>

<div class="admonitionContent_BuS1">

When using a non-pooled transport (the default), you can override the authentication credentials on a per-message basis. This means you can create a single transporter and pass different tokens in the `sendMail` options for each message you send. See [Pooled SMTP Connections](/smtp/pooled) for more information about pooled vs. non-pooled transports.

</div>

</div>

### Gmail-specific helpers<a href="#oauth-gmail" class="hash-link" aria-label="Direct link to Gmail-specific helpers" translate="no" title="Direct link to Gmail-specific helpers">​</a>

Nodemailer includes built-in helpers that automate OAuth2 token management specifically for Gmail. These helpers can automatically refresh expired tokens, generate new tokens using service accounts, or integrate with your custom token provider. For general Gmail setup guidance, including App Passwords as an alternative authentication method, see [Using Gmail](/guides/using-gmail).

#### 3-legged OAuth2 authentication<a href="#oauth-3lo" class="hash-link" aria-label="Direct link to 3-legged OAuth2 authentication" translate="no" title="Direct link to 3-legged OAuth2 authentication">​</a>

In 3-legged OAuth2 (also known as "3LO"), your application requests permission from a user through an interactive consent flow. After the user grants permission, your application receives a *refresh token*. Nodemailer stores this refresh token and uses it to automatically generate new access tokens whenever the current token expires, so you do not need to handle token refresh logic yourself.

- **auth** - authentication object

  - **type** - must be set to `'OAuth2'`
  - **user** - the email address to send from (required)
  - **clientId** - your OAuth2 client ID from Google Cloud Console (required)
  - **clientSecret** - your OAuth2 client secret from Google Cloud Console (required)
  - **refreshToken** - the refresh token obtained during the user consent flow (required)
  - **accessToken** - a current access token (optional; Nodemailer will automatically generate one if not provided or if it has expired)
  - **expires** - UNIX timestamp (in milliseconds) indicating when the access token expires (optional)
  - **accessUrl** - a custom token endpoint URL (optional; defaults to the Gmail token endpoint)
  - **timeout** - access token lifetime in seconds (optional; use this as an alternative to *expires* when you know the token lifetime but not the exact expiration timestamp)
  - **customHeaders** - additional HTTP headers to include in token refresh requests (optional)
  - **customParams** - additional parameters to include in token refresh requests (optional)

#### 2LO authentication (service accounts)<a href="#oauth-2lo" class="hash-link" aria-label="Direct link to 2LO authentication (service accounts)" translate="no" title="Direct link to 2LO authentication (service accounts)">​</a>

2-legged OAuth2 (also known as "2LO") uses a Google service account to impersonate a user without requiring interactive consent. This is ideal for server-to-server communication or automated systems where no user interaction is possible. The service account must have domain-wide delegation enabled in Google Workspace to impersonate users.

- **auth** - authentication object

  - **type** - must be set to `'OAuth2'`
  - **user** - the email address to impersonate and send as (required)
  - **serviceClient** - the service account's `client_id` value from the service account JSON key file (required)
  - **privateKey** - the service account's private key in PEM format from the service account JSON key file (required)
  - **scope** - the OAuth scope to request (optional; defaults to `'https://mail.google.com/'`)
  - **serviceRequestTimeout** - how long the generated token should be valid, in seconds (optional; defaults to 300 seconds, maximum 3600 seconds)

#### Using custom token handling<a href="#custom-handling" class="hash-link" aria-label="Direct link to Using custom token handling" translate="no" title="Direct link to Using custom token handling">​</a>

If you have your own token management system, you can register a callback function that Nodemailer will call whenever it needs an access token. This gives you complete control over how tokens are obtained and managed.

Register the callback using `transporter.set('oauth2_provision_cb', callback)`. Your callback receives three arguments:

- `user` - the email address that needs a token
- `renew` - a boolean indicating whether the previous token failed and a fresh token is needed
- `cb` - the callback function to call with the result: `cb(error, accessToken, expires)`

<div class="language-js codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` js
transporter.set("oauth2_provision_cb", (user, renew, cb) => {
  const token = userTokens[user];
  if (!token) return cb(new Error("Unknown user"));
  cb(null, token);
});
```

</div>

</div>

#### Token update notifications<a href="#update-notification" class="hash-link" aria-label="Direct link to Token update notifications" translate="no" title="Direct link to Token update notifications">​</a>

When Nodemailer generates a new access token (either through a refresh token or a service account), it emits a `token` event. You can listen for this event to persist the new token for future use, which can reduce the number of token refresh requests.

<div class="language-js codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` js
transporter.on("token", (t) => {
  console.log("User:", t.user);
  console.log("New access token:", t.accessToken);
  console.log("Expires at:", new Date(t.expires));
});
```

</div>

</div>

#### Examples<a href="#examples" class="hash-link" aria-label="Direct link to Examples" translate="no" title="Direct link to Examples">​</a>

<div class="theme-admonition theme-admonition-tip admonition_xJq3 alert alert--success">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTIgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTYuNSAwQzMuNDggMCAxIDIuMTkgMSA1YzAgLjkyLjU1IDIuMjUgMSAzIDEuMzQgMi4yNSAxLjc4IDIuNzggMiA0djFoNXYtMWMuMjItMS4yMi42Ni0xLjc1IDItNCAuNDUtLjc1IDEtMi4wOCAxLTMgMC0yLjgxLTIuNDgtNS01LjUtNXptMy42NCA3LjQ4Yy0uMjUuNDQtLjQ3LjgtLjY3IDEuMTEtLjg2IDEuNDEtMS4yNSAyLjA2LTEuNDUgMy4yMy0uMDIuMDUtLjAyLjExLS4wMi4xN0g1YzAtLjA2IDAtLjEzLS4wMi0uMTctLjItMS4xNy0uNTktMS44My0xLjQ1LTMuMjMtLjItLjMxLS40Mi0uNjctLjY3LTEuMTFDMi40NCA2Ljc4IDIgNS42NSAyIDVjMC0yLjIgMi4wMi00IDQuNS00IDEuMjIgMCAyLjM2LjQyIDMuMjIgMS4xOUMxMC41NSAyLjk0IDExIDMuOTQgMTEgNWMwIC42Ni0uNDQgMS43OC0uODYgMi40OHpNNCAxNGg1Yy0uMjMgMS4xNC0xLjMgMi0yLjUgMnMtMi4yNy0uODYtMi41LTJ6IiAvPjwvc3ZnPg==)</span>tip

</div>

<div class="admonitionContent_BuS1">

The examples below use explicit `host`, `port`, and `secure` settings. For Gmail and other popular providers, you can simplify this by using `service: "gmail"` instead. See [Well-Known Services](/smtp/well-known-services) for the full list of supported providers.

</div>

</div>

1.  **Authenticate with an existing token**

Use this approach when you already have a valid access token and simply want to authenticate with it.

<div class="language-js codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` js
let transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    type: "OAuth2",
    user: "user@example.com",
    accessToken: "ya29.Xx_XX0xxxxx-xX0X0XxXXxXxXXXxX0x",
  },
});
```

</div>

</div>

2.  **Custom handler** - token returned by your own service

Use this approach when you have a separate token management service or database that provides tokens on demand.

<div class="language-js codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` js
let transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { type: "OAuth2", user: "user@example.com" },
});

transporter.set("oauth2_provision_cb", (user, renew, cb) => {
  cb(null, userTokens[user]);
});
```

</div>

</div>

3.  **Full 3-legged setup** - Nodemailer refreshes tokens automatically

Use this approach when you have obtained OAuth2 credentials from Google Cloud Console and a refresh token from the user consent flow. Nodemailer will automatically refresh the access token when it expires.

<div class="language-js codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` js
let transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    type: "OAuth2",
    user: "user@example.com",
    clientId: "000000000000-xxx.apps.googleusercontent.com",
    clientSecret: "XxxxxXXxX0xxxxxxxx0XXxX0",
    refreshToken: "1/XXxXxsss-xxxXXXXXxXxx0XXXxxXXx0x00xxx",
    accessToken: "ya29.Xx_XX0xxxxx-xX0X0XxXXxXxXXXxX0x",
    expires: 1484314697598,
  },
});
```

</div>

</div>

4.  **Service account** - token re-generated via 2LO

Use this approach for server-to-server authentication without user interaction. The service account impersonates the specified user and generates tokens automatically.

<div class="language-js codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` js
let transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    type: "OAuth2",
    user: "user@example.com",
    serviceClient: "113600000000000000000",
    privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBg...",
    accessToken: "ya29.Xx_XX0xxxxx-xX0X0XxXXxXxXXXxX0x",
    expires: 1484314697598,
  },
});
```

</div>

</div>

5.  **Per-message auth** - single transport, many users

Use this approach when you need to send emails on behalf of multiple users through a single transporter. You define the client credentials once in the transporter configuration, then provide user-specific tokens with each message.

<div class="language-js codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` js
let transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    type: "OAuth2",
    clientId: "000000000000-xxx.apps.googleusercontent.com",
    clientSecret: "XxxxxXXxX0xxxxxxxx0XXxX0",
  },
});

transporter.sendMail({
  from: "sender@example.com",
  to: "recipient@example.com",
  subject: "Message",
  text: "I hope this message gets through!",
  auth: {
    user: "user@example.com",
    refreshToken: "1/XXxXxsss-xxxXXXXXxXxx0XXXxxXXx0x00xxx",
    accessToken: "ya29.Xx_XX0xxxxx-xX0X0XxXXxXxXXXxX0x",
    expires: 1484314697598,
  },
});
```

</div>

</div>

<div class="theme-admonition theme-admonition-info admonition_xJq3 alert alert--info">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTQgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTcgMi4zYzMuMTQgMCA1LjcgMi41NiA1LjcgNS43cy0yLjU2IDUuNy01LjcgNS43QTUuNzEgNS43MSAwIDAgMSAxLjMgOGMwLTMuMTQgMi41Ni01LjcgNS43LTUuN3pNNyAxQzMuMTQgMSAwIDQuMTQgMCA4czMuMTQgNyA3IDcgNy0zLjE0IDctNy0zLjE0LTctNy03em0xIDNINnY1aDJWNHptMCA2SDZ2Mmgydi0yeiIgLz48L3N2Zz4=)</span>info

</div>

<div class="admonitionContent_BuS1">

Per-message authentication only works with non-pooled transports. If you are using a [pooled transport](/smtp/pooled) (created with `pool: true`), you cannot override authentication on a per-message basis.

</div>

</div>

------------------------------------------------------------------------

#### Troubleshooting<a href="#troubleshooting" class="hash-link" aria-label="Direct link to Troubleshooting" translate="no" title="Direct link to Troubleshooting">​</a>

- **"Invalid grant" or authentication errors with Gmail**: Make sure your access token was requested with the `https://mail.google.com/` scope. Tokens with other scopes will not work for SMTP access.
- **"Access Not Configured" errors**: Verify that the Gmail API is enabled for your project in the Google Cloud Console under APIs & Services.
- **Tokens expiring quickly**: Access tokens typically expire after one hour. If you are using a refresh token, Nodemailer will handle renewal automatically. If you are providing tokens directly, make sure to refresh them before they expire.

</div>

<a href="/smtp/well-known-services" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

Well-Known Services

</div>

<a href="/smtp/pooled" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

Pooled SMTP Connections

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#oauth-token" class="table-of-contents__link toc-highlight">Provider-agnostic OAuth2 authentication</a>
- <a href="#oauth-gmail" class="table-of-contents__link toc-highlight">Gmail-specific helpers</a>

</div>

</div>

</div>

</div>

</div>
