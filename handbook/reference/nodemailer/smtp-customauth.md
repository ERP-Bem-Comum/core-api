<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <a href="/smtp" class="breadcrumbs__link"><span>SMTP transport</span></a>
- <span class="breadcrumbs__link">Custom authentication</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# Custom authentication

</div>

Nodemailer's [SMTP transport](/smtp) supports common authentication mechanisms like LOGIN, PLAIN, and [XOAUTH2](/smtp/oauth2) out of the box. However, some SMTP servers use proprietary or less common authentication methods that Nodemailer does not recognize. For these cases, you can create custom authentication handlers.

## When do I need a custom handler?<a href="#when-do-i-need-a-custom-handler" class="hash-link" aria-label="Direct link to When do I need a custom handler?" translate="no" title="Direct link to When do I need a custom handler?">​</a>

When connecting to an SMTP server, the server advertises which authentication methods it supports. For example, a server might respond with:

<div class="language-text codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` text
250-AUTH LOGIN PLAIN MY-CUSTOM-METHOD
```

</div>

</div>

In this response, the server lists three available authentication methods. Nodemailer already knows how to handle **LOGIN** and **PLAIN**, but it does not recognize **MY-CUSTOM-METHOD**. Without a custom handler, Nodemailer cannot authenticate using this method.

By providing a handler that matches the method name exactly, you enable Nodemailer to complete the authentication exchange.

If a server supports multiple authentication methods, Nodemailer will choose one automatically. To override this behavior and force Nodemailer to use your custom method, set `auth.method` to match your handler's name.

------------------------------------------------------------------------

## Defining a handler<a href="#defining-a-handler" class="hash-link" aria-label="Direct link to Defining a handler" translate="no" title="Direct link to Defining a handler">​</a>

To create a custom authentication handler, add a `customAuth` object to your transporter options. Each key in this object is the authentication method name (case-insensitive, but uppercase is conventional), and each value is a function that performs the authentication exchange.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const nodemailer = require("nodemailer");

// Define the custom authentication handler
async function myCustomMethod(ctx) {
  // Build and send the AUTH command with your custom data
  // This example sends a base64-encoded password (adapt to your server's requirements)
  const response = await ctx.sendCommand(
    "AUTH MY-CUSTOM-METHOD " + Buffer.from(ctx.auth.credentials.pass).toString("base64")
  );

  // Check if the server accepted the authentication
  // SMTP success codes are in the 2xx range (typically 235 for successful auth)
  if (response.status < 200 || response.status >= 300) {
    throw new Error("Authentication failed: " + response.text);
  }
}

const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 465,
  secure: true,
  auth: {
    type: "custom",                // tells Nodemailer to use a custom handler
    method: "MY-CUSTOM-METHOD",    // specifies which handler to use
    user: "username",
    pass: "verysecret",
  },
  customAuth: {
    "MY-CUSTOM-METHOD": myCustomMethod,
  },
});
```

</div>

</div>

### Handler signature<a href="#handler-signature" class="hash-link" aria-label="Direct link to Handler signature" translate="no" title="Direct link to Handler signature">​</a>

<div class="language-ts codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` ts
(ctx: HandlerContext) => Promise<void> | void
```

</div>

</div>

Your handler function receives a context object (`ctx`) and can signal completion in two ways:

1.  **Using Promises (recommended)**: Return a Promise that resolves on success or rejects with an error on failure. You can also use an async function, which implicitly returns a Promise.

2.  **Using callbacks**: Call `ctx.resolve()` to indicate success, or `ctx.reject(err)` to indicate failure. This approach is useful when working with callback-based code.

### Context object properties<a href="#context-object-properties" class="hash-link" aria-label="Direct link to Context object properties" translate="no" title="Direct link to Context object properties">​</a>

The context object (`ctx`) provides everything you need to complete the authentication:

#### `ctx.auth`<a href="#ctxauth" class="hash-link" aria-label="Direct link to ctxauth" translate="no" title="Direct link to ctxauth">​</a>

The complete `auth` object you passed to `createTransport()`. This includes any custom properties you added.

#### `ctx.auth.credentials`<a href="#ctxauthcredentials" class="hash-link" aria-label="Direct link to ctxauthcredentials" translate="no" title="Direct link to ctxauthcredentials">​</a>

A convenient alias containing the authentication credentials:

| Property  | Description                                |
|-----------|--------------------------------------------|
| `user`    | The username from `auth.user`              |
| `pass`    | The password from `auth.pass`              |
| `options` | Any additional options from `auth.options` |

#### `ctx.method`<a href="#ctxmethod" class="hash-link" aria-label="Direct link to ctxmethod" translate="no" title="Direct link to ctxmethod">​</a>

The authentication method name being used (the same value as `auth.method`).

#### `ctx.extensions`<a href="#ctxextensions" class="hash-link" aria-label="Direct link to ctxextensions" translate="no" title="Direct link to ctxextensions">​</a>

An array of SMTP extensions supported by the server (such as `SIZE`, `STARTTLS`, `PIPELINING`). This can be useful if your authentication method depends on certain server capabilities.

#### `ctx.authMethods`<a href="#ctxauthmethods" class="hash-link" aria-label="Direct link to ctxauthmethods" translate="no" title="Direct link to ctxauthmethods">​</a>

An array of authentication methods the server advertised (such as `LOGIN`, `PLAIN`, [`XOAUTH2`](/smtp/oauth2)). You can check this to verify your expected method is available before attempting authentication.

#### `ctx.maxAllowedSize`<a href="#ctxmaxallowedsize" class="hash-link" aria-label="Direct link to ctxmaxallowedsize" translate="no" title="Direct link to ctxmaxallowedsize">​</a>

The maximum message size the server accepts (in bytes), or `false` if the server did not advertise a limit.

### `ctx.sendCommand(command)`<a href="#ctxsendcommandcommand" class="hash-link" aria-label="Direct link to ctxsendcommandcommand" translate="no" title="Direct link to ctxsendcommandcommand">​</a>

Sends a raw SMTP command to the server and returns a Promise that resolves with the server's response. This is your primary tool for implementing the authentication protocol.

**Response object properties:**

| Property | Example | Description |
|----|----|----|
| `status` | `235` | SMTP status code as a number |
| `code` | `2.7.0` | Enhanced status code (if provided) |
| `text` | `Authentication successful` | Human-readable message from the server |
| `response` | `235 2.7.0 Authentication successful` | The complete response line from the server |
| `command` | `AUTH MY-CUSTOM-METHOD ...` | The command that was sent |

**Callback style:**

If you prefer callbacks over Promises, `sendCommand` also accepts an optional callback:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
ctx.sendCommand(command, (err, response) => {
  if (err) {
    return ctx.reject(err);
  }
  // Process response...
  ctx.resolve();
});
```

</div>

</div>

### `ctx.resolve()` and `ctx.reject(err)`<a href="#ctxresolve-and-ctxrejecterr" class="hash-link" aria-label="Direct link to ctxresolve-and-ctxrejecterr" translate="no" title="Direct link to ctxresolve-and-ctxrejecterr">​</a>

These methods signal the outcome of authentication when not using Promises:

- **`ctx.resolve()`**: Call this when authentication succeeds.
- **`ctx.reject(err)`**: Call this with an Error object (or error message) when authentication fails.

When using async functions or returning Promises, you typically do not need these methods directly.

------------------------------------------------------------------------

## Passing additional parameters<a href="#passing-additional-parameters" class="hash-link" aria-label="Direct link to Passing additional parameters" translate="no" title="Direct link to Passing additional parameters">​</a>

If your authentication method requires more than just a username and password, you can include an `options` object in the `auth` configuration. These values become available through `ctx.auth.credentials.options`.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 465,
  secure: true,
  auth: {
    type: "custom",
    method: "MY-CUSTOM-METHOD",
    user: "username",
    pass: "verysecret",
    options: {
      clientId: "my-client-id",
      applicationId: "my-app",
    },
  },
  customAuth: {
    "MY-CUSTOM-METHOD": async (ctx) => {
      // Access additional parameters through ctx.auth.credentials.options
      const { clientId, applicationId } = ctx.auth.credentials.options;

      // Generate a token using your custom logic
      const token = await generateSecretToken(clientId, applicationId);

      // Send the authentication command
      const response = await ctx.sendCommand("AUTH MY-CUSTOM-METHOD " + token);

      if (response.status < 200 || response.status >= 300) {
        throw new Error("Authentication failed: " + response.text);
      }
    },
  },
});
```

</div>

</div>

------------------------------------------------------------------------

## Community-provided handlers<a href="#community-provided-handlers" class="hash-link" aria-label="Direct link to Community-provided handlers" translate="no" title="Direct link to Community-provided handlers">​</a>

The following packages provide ready-to-use handlers for specific authentication methods:

| Mechanism | Package | Notes |
|----|----|----|
| NTLM | <a href="https://github.com/nodemailer/nodemailer-ntlm-auth" target="_blank" rel="noopener noreferrer"><code>nodemailer-ntlm-auth</code></a> | Windows integrated authentication (NTLM) |
| CRAM-MD5 | <a href="https://github.com/nodemailer/nodemailer-cram-md5" target="_blank" rel="noopener noreferrer"><code>nodemailer-cram-md5</code></a> | Challenge-response authentication |

</div>

<a href="/smtp/proxies" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

Proxy support

</div>

<a href="/transports" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

Transports

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#when-do-i-need-a-custom-handler" class="table-of-contents__link toc-highlight">When do I need a custom handler?</a>
- <a href="#defining-a-handler" class="table-of-contents__link toc-highlight">Defining a handler</a>
  - <a href="#handler-signature" class="table-of-contents__link toc-highlight">Handler signature</a>
  - <a href="#context-object-properties" class="table-of-contents__link toc-highlight">Context object properties</a>
  - <a href="#ctxsendcommandcommand" class="table-of-contents__link toc-highlight"><code>ctx.sendCommand(command)</code></a>
  - <a href="#ctxresolve-and-ctxrejecterr" class="table-of-contents__link toc-highlight"><code>ctx.resolve()</code> and <code>ctx.reject(err)</code></a>
- <a href="#passing-additional-parameters" class="table-of-contents__link toc-highlight">Passing additional parameters</a>
- <a href="#community-provided-handlers" class="table-of-contents__link toc-highlight">Community-provided handlers</a>

</div>

</div>

</div>

</div>

</div>
