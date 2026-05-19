<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <a href="/extras" class="breadcrumbs__link"><span>Extra modules</span></a>
- <span class="breadcrumbs__link">SMTP Connection</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# SMTP Connection

</div>

A low-level SMTP client for establishing outbound SMTP connections. This module is the foundation that powers Nodemailer's [SMTP transport](/smtp) internally. Use it when you need direct, fine-grained control over the SMTP session lifecycle.

<div class="theme-admonition theme-admonition-info admonition_xJq3 alert alert--info">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTQgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTcgMi4zYzMuMTQgMCA1LjcgMi41NiA1LjcgNS43cy0yLjU2IDUuNy01LjcgNS43QTUuNzEgNS43MSAwIDAgMSAxLjMgOGMwLTMuMTQgMi41Ni01LjcgNS43LTUuN3pNNyAxQzMuMTQgMSAwIDQuMTQgMCA4czMuMTQgNyA3IDcgNy0zLjE0IDctNy0zLjE0LTctNy03em0xIDNINnY1aDJWNHptMCA2SDZ2Mmgydi0yeiIgLz48L3N2Zz4=)</span>info

</div>

<div class="admonitionContent_BuS1">

SMTPConnection is included with Nodemailer. No additional packages need to be installed.

</div>

</div>

## Usage<a href="#usage" class="hash-link" aria-label="Direct link to Usage" translate="no" title="Direct link to Usage">​</a>

### 1. Import the module<a href="#1-import-the-module" class="hash-link" aria-label="Direct link to 1. Import the module" translate="no" title="Direct link to 1. Import the module">​</a>

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const SMTPConnection = require("nodemailer/lib/smtp-connection");
```

</div>

</div>

### 2. Create a connection instance<a href="#2-create-a-connection-instance" class="hash-link" aria-label="Direct link to 2. Create a connection instance" translate="no" title="Direct link to 2. Create a connection instance">​</a>

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const connection = new SMTPConnection(options);
```

</div>

</div>

### 3. Connect to the server<a href="#3-connect-to-the-server" class="hash-link" aria-label="Direct link to 3. Connect to the server" translate="no" title="Direct link to 3. Connect to the server">​</a>

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
connection.connect(callback);
```

</div>

</div>

### 4. Authenticate (if required)<a href="#4-authenticate-if-required" class="hash-link" aria-label="Direct link to 4. Authenticate (if required)" translate="no" title="Direct link to 4. Authenticate (if required)">​</a>

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
connection.login(auth, callback);
```

</div>

</div>

### 5. Send a message<a href="#5-send-a-message" class="hash-link" aria-label="Direct link to 5. Send a message" translate="no" title="Direct link to 5. Send a message">​</a>

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
connection.send(envelope, message, callback);
```

</div>

</div>

### 6. Close the connection<a href="#6-close-the-connection" class="hash-link" aria-label="Direct link to 6. Close the connection" translate="no" title="Direct link to 6. Close the connection">​</a>

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
connection.quit(); // or connection.close()
```

</div>

</div>

------------------------------------------------------------------------

## Options reference<a href="#options-reference" class="hash-link" aria-label="Direct link to Options reference" translate="no" title="Direct link to Options reference">​</a>

| Option | Type | Default | Description |
|----|----|----|----|
| **host** | `String` | `'localhost'` | The hostname or IP address of the SMTP server to connect to. |
| **port** | `Number` | `587` or `465` | The port number to connect to. Defaults to 465 when `secure` is true, otherwise 587. If port 465 is specified, `secure` defaults to true. |
| **secure** | `Boolean` | `false` | If true, establishes a TLS connection immediately (implicit TLS). If false, the connection starts unencrypted but can be upgraded to TLS via STARTTLS. |
| **servername** | `String` | hostname | The TLS server name for SNI (Server Name Indication). Automatically set to `host` value unless `host` is an IP address. |
| **name** | `String` | `os.hostname()` | The hostname to identify as when sending EHLO/HELO commands. Falls back to `[127.0.0.1]` if the system hostname is not a valid FQDN. |
| **localAddress** | `String` | \- | The local network interface to bind to for outgoing connections. |
| **connectionTimeout** | `Number` | `120000` | Maximum time in milliseconds to wait for the connection to be established (2 minutes). |
| **greetingTimeout** | `Number` | `30000` | Maximum time in milliseconds to wait for the server greeting after the connection is established (30 seconds). |
| **socketTimeout** | `Number` | `600000` | Maximum time in milliseconds of inactivity before the connection is automatically closed (10 minutes). |
| **dnsTimeout** | `Number` | `30000` | Maximum time in milliseconds to wait for DNS resolution (30 seconds). |
| **logger** | `Boolean | Object` | `false` | Set to `true` to enable logging to the console, or provide a Bunyan-compatible logger instance for custom logging. |
| **debug** | `Boolean` | `false` | If true, logs all SMTP traffic (commands and responses) to the logger. |
| **lmtp** | `Boolean` | `false` | If true, uses the LMTP (Local Mail Transfer Protocol) protocol instead of SMTP. |
| **ignoreTLS** | `Boolean` | `false` | If true, does not attempt STARTTLS even if the server advertises support for it. |
| **requireTLS** | `Boolean` | `false` | If true, requires STARTTLS and fails if the upgrade is not successful. |
| **opportunisticTLS** | `Boolean` | `false` | If true, attempts STARTTLS but continues with an unencrypted connection if the upgrade fails. |
| **tls** | `Object` | \- | Additional options passed directly to Node.js `tls.connect()` and `tls.createSecureContext()`. Use this to configure certificates, ciphers, and other TLS settings. |
| **socket** | `net.Socket` | \- | A pre-created socket to use instead of creating a new one. The socket should not yet be connected. |
| **connection** | `net.Socket` | \- | An already-connected socket to use. Useful for connection pooling or [proxy](/smtp/proxies) scenarios. |
| **secured** | `Boolean` | `false` | Set to true when providing a socket via the `connection` option that has already been upgraded to TLS. |
| **allowInternalNetworkInterfaces** | `Boolean` | `false` | If true, allows connections to internal or private network interfaces. |
| **customAuth** | `Object` | \- | Custom authentication handlers for non-standard authentication methods (see [Custom Authentication](/smtp/customauth)). |

------------------------------------------------------------------------

## Events<a href="#events" class="hash-link" aria-label="Direct link to Events" translate="no" title="Direct link to Events">​</a>

SMTPConnection extends Node.js EventEmitter and emits the following events:

| Event | Arguments | Description |
|----|----|----|
| **connect** | \- | Emitted when the connection is established and the SMTP handshake completes successfully. |
| **error** | `Error` | Emitted when an error occurs during the connection or SMTP session. |
| **end** | \- | Emitted when the connection has been closed. |

------------------------------------------------------------------------

## Methods<a href="#methods" class="hash-link" aria-label="Direct link to Methods" translate="no" title="Direct link to Methods">​</a>

### `connect(callback)`<a href="#connectcallback" class="hash-link" aria-label="Direct link to connectcallback" translate="no" title="Direct link to connectcallback">​</a>

Establishes a connection to the SMTP server. The callback is invoked when the connection is ready for commands (after the initial greeting and EHLO/HELO handshake).

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
connection.connect((err) => {
  if (err) {
    console.error("Connection failed:", err);
    return;
  }
  console.log("Connected!");
});
```

</div>

</div>

### `login(auth, callback)`<a href="#loginauth-callback" class="hash-link" aria-label="Direct link to loginauth-callback" translate="no" title="Direct link to loginauth-callback">​</a>

Authenticates with the SMTP server. Only call this method if the server requires authentication. The `auth` object accepts the following properties:

- `user` - The username for authentication
- `pass` - The password for authentication
- `method` - The authentication method to use (optional). If not specified, the client automatically selects the best available method supported by the server
- `oauth2` - An [OAuth2](/smtp/oauth2) token provider object for XOAUTH2 authentication

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
connection.login(
  {
    user: "username",
    pass: "password",
  },
  (err) => {
    if (err) {
      console.error("Authentication failed:", err);
      return;
    }
    console.log("Authenticated!");
  }
);
```

</div>

</div>

### `send(envelope, message, callback)`<a href="#sendenvelope-message-callback" class="hash-link" aria-label="Direct link to sendenvelope-message-callback" translate="no" title="Direct link to sendenvelope-message-callback">​</a>

Sends an email message. The `envelope` defines the sender and recipient addresses for the SMTP transaction, while `message` contains the RFC 5322 formatted email content.

The `message` parameter can be a String, Buffer, or a readable Stream.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const envelope = {
  from: "sender@example.com",
  to: ["recipient@example.com"],
};

const message = "From: sender@example.com\r\nTo: recipient@example.com\r\nSubject: Test\r\n\r\nHello!";

connection.send(envelope, message, (err, info) => {
  if (err) {
    console.error("Send failed:", err);
    return;
  }
  console.log("Message sent:", info);
});
```

</div>

</div>

The callback receives an `info` object with the following properties:

- `accepted` - Array of recipient addresses that were accepted by the server
- `rejected` - Array of recipient addresses that were rejected by the server
- `rejectedErrors` - Array of Error objects with details for each rejected recipient
- `response` - The final response string from the server
- `envelopeTime` - Time in milliseconds spent sending the envelope (MAIL FROM and RCPT TO commands)
- `messageTime` - Time in milliseconds spent sending the message data
- `messageSize` - Size of the sent message in bytes

### `reset(callback)`<a href="#resetcallback" class="hash-link" aria-label="Direct link to resetcallback" translate="no" title="Direct link to resetcallback">​</a>

Sends the SMTP RSET command to reset the current session state. Use this to abort a message transaction without closing the connection.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
connection.reset((err, success) => {
  if (err) {
    console.error("Reset failed:", err);
    return;
  }
  console.log("Session reset");
});
```

</div>

</div>

### `quit()`<a href="#quit" class="hash-link" aria-label="Direct link to quit" translate="no" title="Direct link to quit">​</a>

Sends the SMTP QUIT command and gracefully closes the connection. The server is notified that the session is ending.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
connection.quit();
```

</div>

</div>

### `close()`<a href="#close" class="hash-link" aria-label="Direct link to close" translate="no" title="Direct link to close">​</a>

Closes the connection immediately without sending the QUIT command. Use this for forced disconnection scenarios.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
connection.close();
```

</div>

</div>

------------------------------------------------------------------------

## Envelope options<a href="#envelope-options" class="hash-link" aria-label="Direct link to Envelope options" translate="no" title="Direct link to Envelope options">​</a>

The envelope object defines the SMTP transaction parameters and supports the following properties:

| Property | Type | Description |
|----|----|----|
| **from** | `String` | The sender address used in the MAIL FROM command. |
| **to** | `String[]` | An array of recipient addresses used in RCPT TO commands. |
| **size** | `Number` | The message size in bytes. Used with the SIZE extension to check if the server accepts the message before sending. |
| **use8BitMime** | `Boolean` | If true, requests 8BITMIME encoding when the server supports it. |
| **dsn** | `Object` | Delivery Status Notification options (see below). |

### DSN options<a href="#dsn-options" class="hash-link" aria-label="Direct link to DSN options" translate="no" title="Direct link to DSN options">​</a>

Delivery Status Notifications allow you to receive reports about the delivery status of your message. The DSN object supports these properties:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const envelope = {
  from: "sender@example.com",
  to: ["recipient@example.com"],
  dsn: {
    ret: "HDRS", // What to return in DSN: 'HDRS' for headers only, 'FULL' for the complete message
    envid: "unique-id-123", // A unique envelope identifier for tracking
    notify: "SUCCESS,FAILURE", // When to send DSN: 'NEVER', 'SUCCESS', 'FAILURE', 'DELAY' (comma-separated)
    orcpt: "rfc822;original@example.com", // The original recipient address (format: address-type;address)
  },
};
```

</div>

</div>

------------------------------------------------------------------------

## Complete example<a href="#complete-example" class="hash-link" aria-label="Direct link to Complete example" translate="no" title="Direct link to Complete example">​</a>

This example demonstrates the full workflow: connecting, authenticating, sending a message, and closing the connection.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const SMTPConnection = require("nodemailer/lib/smtp-connection");

const connection = new SMTPConnection({
  host: "smtp.example.com",
  port: 587,
  secure: false,
  debug: true,
  logger: true,
});

connection.on("error", (err) => {
  console.error("Connection error:", err);
});

connection.connect((err) => {
  if (err) {
    console.error("Failed to connect:", err);
    return;
  }

  connection.login(
    {
      user: "username",
      pass: "password",
    },
    (err) => {
      if (err) {
        console.error("Authentication failed:", err);
        connection.close();
        return;
      }

      const envelope = {
        from: "sender@example.com",
        to: ["recipient@example.com"],
      };

      const message = `From: sender@example.com
To: recipient@example.com
Subject: Test Message
Content-Type: text/plain; charset=utf-8

Hello from SMTPConnection!`;

      connection.send(envelope, message, (err, info) => {
        if (err) {
          console.error("Failed to send:", err);
        } else {
          console.log("Message sent!");
          console.log("Accepted:", info.accepted);
          console.log("Rejected:", info.rejected);
          console.log("Response:", info.response);
        }

        connection.quit();
      });
    }
  );
});
```

</div>

</div>

------------------------------------------------------------------------

## Properties<a href="#properties" class="hash-link" aria-label="Direct link to Properties" translate="no" title="Direct link to Properties">​</a>

After connecting, you can access the following properties on the connection instance:

| Property | Type | Description |
|----|----|----|
| **id** | `String` | A unique identifier for this connection instance. |
| **secure** | `Boolean` | True if the connection is using TLS encryption. |
| **authenticated** | `Boolean` | True if the user has successfully authenticated. |
| **lastServerResponse** | `String` | The most recent response received from the server. |
| **allowsAuth** | `Boolean` | True if the server advertises authentication support in its EHLO response. |

------------------------------------------------------------------------

## Supported authentication methods<a href="#supported-authentication-methods" class="hash-link" aria-label="Direct link to Supported authentication methods" translate="no" title="Direct link to Supported authentication methods">​</a>

SMTPConnection supports the following authentication methods:

- `PLAIN` - Sends credentials in base64 encoding
- `LOGIN` - Legacy method that sends username and password separately
- `CRAM-MD5` - Challenge-response authentication using MD5 hashing
- `XOAUTH2` - [OAuth 2.0](/smtp/oauth2) authentication for services like Gmail
- Custom methods via the `customAuth` option

The client automatically selects the most secure available method unless you specify one explicitly.

------------------------------------------------------------------------

## License<a href="#license" class="hash-link" aria-label="Direct link to License" translate="no" title="Direct link to License">​</a>

<a href="https://github.com/nodemailer/nodemailer/blob/master/LICENSE" target="_blank" rel="noopener noreferrer">MIT</a>

</div>

<a href="/extras/smtp-server" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

SMTP Server

</div>

<a href="/extras/mailparser" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

MailParser

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#usage" class="table-of-contents__link toc-highlight">Usage</a>
  - <a href="#1-import-the-module" class="table-of-contents__link toc-highlight">1. Import the module</a>
  - <a href="#2-create-a-connection-instance" class="table-of-contents__link toc-highlight">2. Create a connection instance</a>
  - <a href="#3-connect-to-the-server" class="table-of-contents__link toc-highlight">3. Connect to the server</a>
  - <a href="#4-authenticate-if-required" class="table-of-contents__link toc-highlight">4. Authenticate (if required)</a>
  - <a href="#5-send-a-message" class="table-of-contents__link toc-highlight">5. Send a message</a>
  - <a href="#6-close-the-connection" class="table-of-contents__link toc-highlight">6. Close the connection</a>
- <a href="#options-reference" class="table-of-contents__link toc-highlight">Options reference</a>
- <a href="#events" class="table-of-contents__link toc-highlight">Events</a>
- <a href="#methods" class="table-of-contents__link toc-highlight">Methods</a>
  - <a href="#connectcallback" class="table-of-contents__link toc-highlight"><code>connect(callback)</code></a>
  - <a href="#loginauth-callback" class="table-of-contents__link toc-highlight"><code>login(auth, callback)</code></a>
  - <a href="#sendenvelope-message-callback" class="table-of-contents__link toc-highlight"><code>send(envelope, message, callback)</code></a>
  - <a href="#resetcallback" class="table-of-contents__link toc-highlight"><code>reset(callback)</code></a>
  - <a href="#quit" class="table-of-contents__link toc-highlight"><code>quit()</code></a>
  - <a href="#close" class="table-of-contents__link toc-highlight"><code>close()</code></a>
- <a href="#envelope-options" class="table-of-contents__link toc-highlight">Envelope options</a>
  - <a href="#dsn-options" class="table-of-contents__link toc-highlight">DSN options</a>
- <a href="#complete-example" class="table-of-contents__link toc-highlight">Complete example</a>
- <a href="#properties" class="table-of-contents__link toc-highlight">Properties</a>
- <a href="#supported-authentication-methods" class="table-of-contents__link toc-highlight">Supported authentication methods</a>
- <a href="#license" class="table-of-contents__link toc-highlight">License</a>

</div>

</div>

</div>

</div>

</div>
