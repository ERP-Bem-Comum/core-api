<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <span class="breadcrumbs__link">SMTP transport</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# SMTP transport

</div>

SMTP is the main transport in Nodemailer for delivering messages. SMTP (Simple Mail Transfer Protocol) is also the standard protocol that email servers use to communicate with each other, making it truly universal. Almost every email delivery provider supports SMTP-based sending, even when they primarily advertise API-based sending. While APIs may offer additional features, they also create vendor lock-in. With SMTP, you can switch providers by simply changing your configuration object or connection URL.

## Creating a transport<a href="#creating-a-transport" class="hash-link" aria-label="Direct link to Creating a transport" translate="no" title="Direct link to Creating a transport">​</a>

To send emails via SMTP, create a transporter object by calling `nodemailer.createTransport()`:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport(options[, defaults]);
```

</div>

</div>

- **`options`** - an object that defines the SMTP connection settings (detailed in the sections below).
- **`defaults`** - an optional object whose properties are merged into every [message](/message) you send. This is useful for setting a common **from** address or other repeated values.

Instead of an options object, you can also pass a connection URL. Use the **smtp:** protocol for standard connections, **smtps:** for connections that use TLS from the start (typically port 465), or **direct:** to connect directly to the recipient's MX server (bypassing your own SMTP relay).

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
// Pooled connection via TLS
const transporter = nodemailer.createTransport(
  "smtps://username:password@smtp.example.com/?pool=true"
);

// Direct delivery to the recipient's MX server (no relay)
const transporter = nodemailer.createTransport("direct:?name=hostname.example.com");
```

</div>

</div>

You can pass any transport option as a query parameter in the URL:

| Parameter | Example | Description |
|----|----|----|
| `pool` | `pool=true` | Enable connection pooling |
| `maxConnections` | `maxConnections=5` | Maximum simultaneous pool connections |
| `maxMessages` | `maxMessages=100` | Messages per connection before reconnecting |
| `service` | `service=gmail` | Use a well-known service preset |

### General options<a href="#general-options" class="hash-link" aria-label="Direct link to General options" translate="no" title="Direct link to General options">​</a>

| Name | Type | Default | Description |
|----|----|----|----|
| `host` | `string` | `"localhost"` | The hostname or IP address of the SMTP server to connect to. |
| `port` | `number` | `587` (`465` if `secure: true`) | The port number to connect to. |
| `secure` | `boolean` | `false` | If `true`, the connection uses TLS immediately upon connecting. Set this to `true` when connecting to port 465. For port 587 or 25, leave this as `false` and let STARTTLS upgrade the connection. |
| `service` | `string` | -- | A shortcut to configure well-known email services like `"gmail"` or `"outlook"`. When set, this overrides `host`, `port`, and `secure` with predefined values. See the [well-known services list](/smtp/well-known-services). |
| `auth` | `object` | -- | Authentication credentials (see [Authentication](#authentication) below). |
| `authMethod` | `string` | `"PLAIN"` | The preferred SASL authentication method. Common values include `"PLAIN"`, `"LOGIN"`, and `"CRAM-MD5"`. |

<div class="theme-admonition theme-admonition-info admonition_xJq3 alert alert--info">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTQgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTcgMi4zYzMuMTQgMCA1LjcgMi41NiA1LjcgNS43cy0yLjU2IDUuNy01LjcgNS43QTUuNzEgNS43MSAwIDAgMSAxLjMgOGMwLTMuMTQgMi41Ni01LjcgNS43LTUuN3pNNyAxQzMuMTQgMSAwIDQuMTQgMCA4czMuMTQgNyA3IDcgNy0zLjE0IDctNy0zLjE0LTctNy03em0xIDNINnY1aDJWNHptMCA2SDZ2Mmgydi0yeiIgLz48L3N2Zz4=)</span>info

</div>

<div class="admonitionContent_BuS1">

When you specify a hostname, Nodemailer resolves it using DNS before connecting. If you use an IP address directly (or a hostname that only exists in **/etc/hosts** and not in DNS), you should also set `tls.servername` to the actual hostname. This ensures TLS certificate validation works correctly even when DNS lookup is skipped.

</div>

</div>

### TLS options<a href="#tls-options" class="hash-link" aria-label="Direct link to TLS options" translate="no" title="Direct link to TLS options">​</a>

| Name | Type | Default | Description |
|----|----|----|----|
| `secure` | `boolean` | `false` | See **General options** above. |
| `tls` | `object` | -- | Additional options passed directly to <a href="https://nodejs.org/api/tls.html#class-tlstlssocket" target="_blank" rel="noopener noreferrer">Node.js <code>TLSSocket</code></a>. For example, `{ rejectUnauthorized: false }` to accept self-signed certificates. |
| `tls.servername` | `string` | -- | The hostname to use for TLS certificate validation. Required when `host` is set to an IP address. Can also be set as a top-level `servername` option outside the `tls` object. |
| `ignoreTLS` | `boolean` | `false` | If `true`, Nodemailer will not use STARTTLS even if the server advertises support for it. The connection remains unencrypted. |
| `requireTLS` | `boolean` | `false` | If `true`, Nodemailer requires a STARTTLS upgrade. If the server does not support STARTTLS, sending fails with an error. |

<div class="theme-admonition theme-admonition-info admonition_xJq3 alert alert--info">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTQgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTcgMi4zYzMuMTQgMCA1LjcgMi41NiA1LjcgNS43cy0yLjU2IDUuNy01LjcgNS43QTUuNzEgNS43MSAwIDAgMSAxLjMgOGMwLTMuMTQgMi41Ni01LjcgNS43LTUuN3pNNyAxQzMuMTQgMSAwIDQuMTQgMCA4czMuMTQgNyA3IDcgNy0zLjE0IDctNy0zLjE0LTctNy03em0xIDNINnY1aDJWNHptMCA2SDZ2Mmgydi0yeiIgLz48L3N2Zz4=)</span>info

</div>

<div class="admonitionContent_BuS1">

Setting **`secure: false`** does **not** mean your emails are sent unencrypted. Most modern SMTP servers support <a href="https://datatracker.ietf.org/doc/html/rfc3207" target="_blank" rel="noopener noreferrer">STARTTLS</a>, which upgrades an unencrypted connection to an encrypted one after connecting. Nodemailer automatically uses STARTTLS when available, unless you explicitly disable it with `ignoreTLS: true`.

</div>

</div>

### Connection options<a href="#connection-options" class="hash-link" aria-label="Direct link to Connection options" translate="no" title="Direct link to Connection options">​</a>

| Name | Default | Description |
|----|----|----|
| `name` | local hostname | The hostname sent in the `EHLO` (or `HELO`) greeting. The server uses this to identify your client. Defaults to your machine's hostname. |
| `localAddress` | -- | The local network interface to bind when making the connection. Useful when your machine has multiple network interfaces. |
| `connectionTimeout` | 120000 ms | How long to wait (in milliseconds) for the TCP connection to be established before giving up. |
| `greetingTimeout` | 30000 ms | How long to wait (in milliseconds) for the server to send its initial greeting after the connection is established. |
| `socketTimeout` | 600000 ms | How long a connection can remain idle (in milliseconds) before Nodemailer closes it. The default is 10 minutes. |
| `dnsTimeout` | 30000 ms | Maximum time (in milliseconds) to wait for DNS lookups to complete. |
| `dnsTtl` | 300000 ms | How long (in milliseconds) to cache DNS lookup results. The default is 5 minutes. |
| `lmtp` | `false` | If `true`, use the LMTP (Local Mail Transfer Protocol) instead of SMTP. LMTP is typically used for local mail delivery. |
| `opportunisticTLS` | `false` | If `true`, Nodemailer continues with an unencrypted connection when STARTTLS upgrade fails, instead of aborting. |
| `forceAuth` | `false` | If `true`, attempt authentication even when the server does not advertise AUTH capability. Some misconfigured servers require this. |
| `allowInternalNetworkInterfaces` | `false` | If `true`, allows connections to internal/private network interfaces during DNS resolution. By default, Nodemailer skips private IP addresses when resolving hostnames. |

### Debug options<a href="#debug-options" class="hash-link" aria-label="Direct link to Debug options" translate="no" title="Direct link to Debug options">​</a>

| Name | Type | Description |
|----|----|----|
| `logger` | `object` / `boolean` | Set to `true` to enable console logging, or pass a <a href="https://github.com/trentm/node-bunyan" target="_blank" rel="noopener noreferrer">Bunyan</a>-compatible logger instance for custom logging. Set to `false` or leave unset to disable logging. |
| `debug` | `boolean` | If `true`, logs the raw SMTP protocol traffic (commands and responses). When `false`, only high-level transaction events are logged. |
| `transactionLog` | `boolean` | If `true`, logs SMTP commands and responses at the transaction level. Similar to `debug` but can be used independently for lighter logging without full protocol traces. |
| `component` | `string` | The component name used in log output (e.g., `'smtp-transport'`, `'smtp-pool'`). Useful when running multiple transporters to identify which one generated a log entry. |

**Custom logger**

If you want to use a logging library like <a href="https://github.com/pinojs/pino" target="_blank" rel="noopener noreferrer">Pino</a> or another custom logger, you can wrap it in a Nodemailer-compatible logger object. The logger must implement methods for each log level: `trace`, `debug`, `info`, `warn`, `error`, and `fatal`.

<div class="language-js codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` js
const smtpLogger = {};

// Set up logger wrapper for each log level
for (let level of ['trace', 'debug', 'info', 'warn', 'error', 'fatal']) {
    smtpLogger[level] = (data, message, ...args) => {
        if (args && args.length) {
            message = util.format(message, ...args);
        }
        data.msg = message;
        data.src = 'nodemailer';
        if (typeof pinoLogger[level] === 'function') {
            pinoLogger[level](data);
        } else {
            pinoLogger.debug(data);
        }
    };
}

nodemailer.createTransport({
    // ... other options
    logger: smtpLogger
})
```

</div>

</div>

### Security options<a href="#security-options" class="hash-link" aria-label="Direct link to Security options" translate="no" title="Direct link to Security options">​</a>

These options restrict how Nodemailer handles attachments and content sources:

| Name | Type | Description |
|----|----|----|
| `disableFileAccess` | `boolean` | If `true`, prevents Nodemailer from reading attachment content from the filesystem (paths like `/path/to/file.pdf`). |
| `disableUrlAccess` | `boolean` | If `true`, prevents Nodemailer from fetching attachment content from URLs (like `https://example.com/file.pdf`). |

### Pooling options<a href="#pooling-options" class="hash-link" aria-label="Direct link to Pooling options" translate="no" title="Direct link to Pooling options">​</a>

Connection pooling keeps multiple SMTP connections open to send messages faster. See [Pooled SMTP](/smtp/pooled) for the complete list of pooling options. The most important option is:

| Name | Type | Description |
|----|----|----|
| `pool` | `boolean` | If `true`, enables connection pooling. Pooled connections are reused for multiple messages. |

### Proxy options<a href="#proxy-options" class="hash-link" aria-label="Direct link to Proxy options" translate="no" title="Direct link to Proxy options">​</a>

You can route SMTP connections through HTTP or SOCKS proxies. Read more in [Using proxies](/smtp/proxies).

## Examples<a href="#examples" class="hash-link" aria-label="Direct link to Examples" translate="no" title="Direct link to Examples">​</a>

### 1. Single connection<a href="#1-single-connection" class="hash-link" aria-label="Direct link to 1. Single connection" translate="no" title="Direct link to 1. Single connection">​</a>

This is the simplest configuration. A new SMTP connection is created for each message you send. The connection starts unencrypted but is automatically upgraded via STARTTLS if the server supports it.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 587,
  secure: false, // Start unencrypted, upgrade via STARTTLS
  auth: {
    user: "username",
    pass: "password",
  },
});
```

</div>

</div>

### 2. Pooled connections<a href="#2-pooled-connections" class="hash-link" aria-label="Direct link to 2. Pooled connections" translate="no" title="Direct link to 2. Pooled connections">​</a>

For better performance when sending multiple messages, use connection pooling. This keeps connections open and reuses them, avoiding the overhead of establishing a new connection for each message.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const transporter = nodemailer.createTransport({
  pool: true,
  host: "smtp.example.com",
  port: 465,
  secure: true, // Use TLS from the start (required for port 465)
  auth: {
    user: "username",
    pass: "password",
  },
});
```

</div>

</div>

### 3. Allow self-signed certificates<a href="#3-allow-self-signed-certificates" class="hash-link" aria-label="Direct link to 3. Allow self-signed certificates" translate="no" title="Direct link to 3. Allow self-signed certificates">​</a>

In development environments or internal networks, you may need to connect to servers using self-signed certificates. Disable certificate validation with `rejectUnauthorized: false`. Note that this reduces security and should not be used in production.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const transporter = nodemailer.createTransport({
  host: "my.smtp.host",
  port: 465,
  secure: true,
  auth: {
    user: "username",
    pass: "password",
  },
  tls: {
    // Accept self-signed or invalid certificates
    rejectUnauthorized: false,
  },
});
```

</div>

</div>

## Authentication<a href="#authentication" class="hash-link" aria-label="Direct link to Authentication" translate="no" title="Direct link to Authentication">​</a>

Most SMTP servers require authentication before accepting messages. Nodemailer supports several authentication methods.

If you omit the **auth** object entirely, Nodemailer attempts to send without authentication. This works only with servers that allow unauthenticated sending (typically internal relay servers).

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 587,
});
```

</div>

</div>

### Login<a href="#login" class="hash-link" aria-label="Direct link to Login" translate="no" title="Direct link to Login">​</a>

The most common authentication method uses a username and password. Nodemailer automatically selects the best available mechanism (PLAIN, LOGIN, or CRAM-MD5) based on what the server supports.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
auth: {
  type: "login", // Optional, this is the default
  user: "username",
  pass: "password",
}
```

</div>

</div>

### OAuth 2.0<a href="#oauth-20" class="hash-link" aria-label="Direct link to OAuth 2.0" translate="no" title="Direct link to OAuth 2.0">​</a>

For services like Gmail or Outlook that support OAuth 2.0, you can authenticate using an access token instead of a password. This is more secure because you do not need to store your password.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
auth: {
  type: "oauth2",
  user: "user@example.com",
  accessToken: "generated_access_token",
  expires: 1484314697598, // Token expiration timestamp in milliseconds
}
```

</div>

</div>

See the dedicated [OAuth 2.0 guide](/smtp/oauth2) for complete setup instructions, including how to automatically refresh tokens. If you need to use an authentication protocol that Nodemailer does not support natively, you can implement a [custom authentication handler](/smtp/customauth) (see the <a href="https://github.com/nodemailer/nodemailer-ntlm-auth" target="_blank" rel="noopener noreferrer">NTLM handler</a> for an example).

## Verifying the configuration<a href="#verifying-the-configuration" class="hash-link" aria-label="Direct link to Verifying the configuration" translate="no" title="Direct link to Verifying the configuration">​</a>

Before sending your first email, you can test whether your SMTP configuration is correct using **`transporter.verify()`**. This method attempts to connect to the server and authenticate without sending any message.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
// Using async/await
try {
  await transporter.verify();
  console.log("Server is ready to take our messages");
} catch (err) {
  console.error("Verification failed", err);
}

// Using callbacks
transporter.verify((error, success) => {
  if (error) {
    console.error(error);
  } else {
    console.log("Server is ready to take our messages");
  }
});
```

</div>

</div>

The `verify()` method tests DNS resolution, the TCP connection, TLS upgrade (if applicable), and authentication. However, it does **not** verify whether the server will accept messages from a specific sender address - that can only be determined when you actually send a message, and depends on the server's policies.

</div>

<a href="/message/playground" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

Message Playground

</div>

<a href="/smtp/well-known-services" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

Well-Known Services

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#creating-a-transport" class="table-of-contents__link toc-highlight">Creating a transport</a>
  - <a href="#general-options" class="table-of-contents__link toc-highlight">General options</a>
  - <a href="#tls-options" class="table-of-contents__link toc-highlight">TLS options</a>
  - <a href="#connection-options" class="table-of-contents__link toc-highlight">Connection options</a>
  - <a href="#debug-options" class="table-of-contents__link toc-highlight">Debug options</a>
  - <a href="#security-options" class="table-of-contents__link toc-highlight">Security options</a>
  - <a href="#pooling-options" class="table-of-contents__link toc-highlight">Pooling options</a>
  - <a href="#proxy-options" class="table-of-contents__link toc-highlight">Proxy options</a>
- <a href="#examples" class="table-of-contents__link toc-highlight">Examples</a>
  - <a href="#1-single-connection" class="table-of-contents__link toc-highlight">1. Single connection</a>
  - <a href="#2-pooled-connections" class="table-of-contents__link toc-highlight">2. Pooled connections</a>
  - <a href="#3-allow-self-signed-certificates" class="table-of-contents__link toc-highlight">3. Allow self-signed certificates</a>
- <a href="#authentication" class="table-of-contents__link toc-highlight">Authentication</a>
  - <a href="#login" class="table-of-contents__link toc-highlight">Login</a>
  - <a href="#oauth-20" class="table-of-contents__link toc-highlight">OAuth 2.0</a>
- <a href="#verifying-the-configuration" class="table-of-contents__link toc-highlight">Verifying the configuration</a>

</div>

</div>

</div>

</div>

</div>
