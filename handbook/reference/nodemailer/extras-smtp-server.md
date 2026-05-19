<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <a href="/extras" class="breadcrumbs__link"><span>Extra modules</span></a>
- <span class="breadcrumbs__link">SMTP Server</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# SMTP Server

</div>

Create SMTP and LMTP server instances on the fly. The *smtp-server* module is **not** a full-blown mail server application like <a href="https://haraka.github.io/" target="_blank" rel="noopener noreferrer">Haraka</a>. Instead, it provides a convenient way to add custom SMTP or LMTP listeners to your Node.js application. It is the successor to the server portion of the now-deprecated <a href="https://www.npmjs.com/package/simplesmtp" target="_blank" rel="noopener noreferrer">simplesmtp</a> module. For a matching SMTP client, see [SMTP Connection](/extras/smtp-connection). This module is also useful for [testing email functionality](/guides/testing-with-ethereal) in development environments.

## Usage<a href="#usage" class="hash-link" aria-label="Direct link to Usage" translate="no" title="Direct link to Usage">​</a>

### 1. Install<a href="#1-install" class="hash-link" aria-label="Direct link to 1. Install" translate="no" title="Direct link to 1. Install">​</a>

<div class="language-bash codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` bash
npm install smtp-server --save
```

</div>

</div>

### 2. Require in your script<a href="#2-require-in-your-script" class="hash-link" aria-label="Direct link to 2. Require in your script" translate="no" title="Direct link to 2. Require in your script">​</a>

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const { SMTPServer } = require("smtp-server");
```

</div>

</div>

### 3. Create a server instance<a href="#3-create-a-server-instance" class="hash-link" aria-label="Direct link to 3. Create a server instance" translate="no" title="Direct link to 3. Create a server instance">​</a>

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const server = new SMTPServer(options);
```

</div>

</div>

### 4. Start listening<a href="#4-start-listening" class="hash-link" aria-label="Direct link to 4. Start listening" translate="no" title="Direct link to 4. Start listening">​</a>

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
server.listen(port[, host][, callback]);
```

</div>

</div>

### 5. Shut down<a href="#5-shut-down" class="hash-link" aria-label="Direct link to 5. Shut down" translate="no" title="Direct link to 5. Shut down">​</a>

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
server.close(callback);
```

</div>

</div>

## Options reference<a href="#options-reference" class="hash-link" aria-label="Direct link to Options reference" translate="no" title="Direct link to Options reference">​</a>

| Option | Type | Default | Description |
|----|----|----|----|
| **secure** | `Boolean` | `false` | Start the server in TLS mode. You can still upgrade non-TLS connections with `STARTTLS` if you leave this `false`. |
| **name** | `String` | `os.hostname()` | The server hostname announced in the greeting banner. |
| **banner** | `String` | \- | Custom greeting message appended to the standard ESMTP banner sent when a client first connects. |
| **heloResponse** | `String` | `'%s Nice to meet you, %s'` | Format string for the HELO/EHLO greeting. Use `%s` placeholders: first = server name, second = client hostname. |
| **size** | `Number` | `0` | Maximum allowed message size in bytes. `0` means unlimited. |
| **hideSize** | `Boolean` | `false` | Hides the SIZE limit from clients in EHLO response, but still tracks `stream.sizeExceeded` internally. |
| **authMethods** | `String[]` | `['PLAIN', 'LOGIN']` | Authentication mechanisms to offer. Add `'XOAUTH2'` and/or `'CRAM-MD5'` as needed. |
| **authOptional** | `Boolean` | `false` | Allow clients to proceed without authentication. When `false`, authentication is required before sending mail. |
| **disabledCommands** | `String[]` | \- | SMTP commands to disable, e.g., `['AUTH']` to disable authentication entirely. |
| **hideSTARTTLS / hidePIPELINING / hide8BITMIME / hideSMTPUTF8** | `Boolean` | `false` | Hide the specified capability from the EHLO response. |
| **hideENHANCEDSTATUSCODES** | `Boolean` | `true` | When `true` (default), enhanced status codes (RFC 2034/3463) are not included in responses. Set to `false` to enable them. |
| **hideDSN** | `Boolean` | `true` | When `true` (default), DSN (Delivery Status Notification) capability is hidden. Set to `false` to enable DSN support. |
| **hideREQUIRETLS** | `Boolean` | `true` | When `true` (default), REQUIRETLS capability (RFC 8689) is hidden. Set to `false` to advertise REQUIRETLS support. |
| **allowInsecureAuth** | `Boolean` | `false` | Allow authentication over unencrypted connections. Not recommended for production. |
| **disableReverseLookup** | `Boolean` | `false` | Skip reverse DNS lookup of the client IP address. |
| **sniOptions** | `Map | Object` | \- | TLS options keyed by SNI hostname for serving different certificates based on the requested hostname. |
| **logger** | `Boolean | Object` | `false` | Set to `true` to log to the console, or provide a Bunyan-compatible logger instance. |
| **maxClients** | `Number` | `Infinity` | Maximum number of concurrent client connections. |
| **useProxy** | `Boolean` | `false` | Expect an HAProxy <a href="http://www.haproxy.org/download/1.5/doc/proxy-protocol.txt" target="_blank" rel="noopener noreferrer">PROXY protocol</a> header before the SMTP session. |
| **useXClient / useXForward** | `Boolean` | `false` | Enable Postfix <a href="http://www.postfix.org/XCLIENT_README.html" target="_blank" rel="noopener noreferrer">XCLIENT</a> or <a href="http://www.postfix.org/XFORWARD_README.html" target="_blank" rel="noopener noreferrer">XFORWARD</a> extensions. |
| **lmtp** | `Boolean` | `false` | Use LMTP (Local Mail Transfer Protocol) instead of SMTP. |
| **socketTimeout** | `Number` | `60_000` | Idle timeout in milliseconds before disconnecting an inactive client. |
| **closeTimeout** | `Number` | `30_000` | Time in milliseconds to wait for pending connections to finish when calling `close()`. |
| **onAuth / onConnect / onSecure / onMailFrom / onRcptTo / onData / onClose** | `Function` | \- | Lifecycle callback handlers (detailed in sections below). |
| **resolver** | `Object` | \- | Custom DNS resolver object with a `.reverse()` method. Defaults to the Node.js built-in `dns` module. |

You may also pass any options accepted by <a href="https://nodejs.org/api/net.html#net_net_createserver_options_connectionlistener" target="_blank" rel="noopener noreferrer"><code>net.createServer</code></a>. When `secure` is `true`, you can additionally pass <a href="https://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener" target="_blank" rel="noopener noreferrer"><code>tls.createServer</code></a> options.

------------------------------------------------------------------------

## Customizing greetings<a href="#customizing-greetings" class="hash-link" aria-label="Direct link to Customizing greetings" translate="no" title="Direct link to Customizing greetings">​</a>

### Initial connection banner<a href="#initial-connection-banner" class="hash-link" aria-label="Direct link to Initial connection banner" translate="no" title="Direct link to Initial connection banner">​</a>

The `banner` option adds a custom message to the initial connection response (the 220 greeting):

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const server = new SMTPServer({
  banner: "Welcome to our mail service",
});
// Client sees: "220 hostname ESMTP Welcome to our mail service"
```

</div>

</div>

### HELO/EHLO response<a href="#heloehlo-response" class="hash-link" aria-label="Direct link to HELO/EHLO response" translate="no" title="Direct link to HELO/EHLO response">​</a>

The `heloResponse` option customizes the greeting returned after a client sends HELO or EHLO. Use `%s` placeholders for dynamic values:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const server = new SMTPServer({
  heloResponse: "%s says hello to %s",
});
// Client sees: "250 hostname says hello to client.example.com"
```

</div>

</div>

**Placeholders:**

- First `%s` is replaced with the server name (from the `name` option or `os.hostname()`)
- Second `%s` is replaced with the client hostname (reverse DNS lookup result or IP address in brackets)

**Examples:**

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
// Default behavior (no configuration needed)
// "250 hostname Nice to meet you, client.example.com"

// Custom formal greeting
heloResponse: "Welcome to %s mail server"
// "250 Welcome to hostname mail server"

// Simple greeting without placeholders
heloResponse: "Hello"
// "250 Hello"

// Using both placeholders
heloResponse: "%s greets %s"
// "250 hostname greets client.example.com"
```

</div>

</div>

------------------------------------------------------------------------

## TLS and STARTTLS<a href="#tls-and-starttls" class="hash-link" aria-label="Direct link to TLS and STARTTLS" translate="no" title="Direct link to TLS and STARTTLS">​</a>

If you enable TLS (`secure: true`) or leave `STARTTLS` available (the default), you should provide a valid certificate using the `key`, `cert`, and optionally `ca` options. Without a proper certificate, *smtp-server* uses a self-signed certificate for `localhost`, which most email clients will reject.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const fs = require("fs");
const server = new SMTPServer({
  secure: true,
  key: fs.readFileSync("private.key"),
  cert: fs.readFileSync("server.crt"),
});
server.listen(465);
```

</div>

</div>

------------------------------------------------------------------------

## Handling errors<a href="#handling-errors" class="hash-link" aria-label="Direct link to Handling errors" translate="no" title="Direct link to Handling errors">​</a>

Listen for the `error` event to handle server-level errors:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
server.on("error", (err) => {
  console.error("SMTP Server error:", err.message);
});
```

</div>

</div>

------------------------------------------------------------------------

## Handling authentication (`onAuth`)<a href="#handling-authentication-onauth" class="hash-link" aria-label="Direct link to handling-authentication-onauth" translate="no" title="Direct link to handling-authentication-onauth">​</a>

The `onAuth` callback is invoked when a client attempts to authenticate. Use it to verify credentials and accept or reject the login attempt.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const server = new SMTPServer({
  onAuth(auth, session, callback) {
    // auth.method contains the authentication method: 'PLAIN', 'LOGIN', 'XOAUTH2', or 'CRAM-MD5'
    // Call callback(err) to reject, or callback(null, { user: ... }) to accept
  },
});
```

</div>

</div>

### Password-based authentication (PLAIN / LOGIN)<a href="#password-based-authentication-plain--login" class="hash-link" aria-label="Direct link to Password-based authentication (PLAIN / LOGIN)" translate="no" title="Direct link to Password-based authentication (PLAIN / LOGIN)">​</a>

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
onAuth(auth, session, callback) {
  if (auth.username !== "alice" || auth.password !== "s3cr3t") {
    return callback(new Error("Invalid username or password"));
  }
  callback(null, { user: auth.username });
}
```

</div>

</div>

### OAuth 2 authentication (`XOAUTH2`)<a href="#oauth-2-authentication-xoauth2" class="hash-link" aria-label="Direct link to oauth-2-authentication-xoauth2" translate="no" title="Direct link to oauth-2-authentication-xoauth2">​</a>

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const server = new SMTPServer({
  authMethods: ["XOAUTH2"],
  onAuth(auth, session, callback) {
    if (auth.accessToken !== "ya29.a0Af...") {
      // Return OAuth error response per RFC 6750 Section 3
      return callback(null, {
        data: { status: "401", schemes: "bearer" },
      });
    }
    callback(null, { user: auth.username });
  },
});
```

</div>

</div>

------------------------------------------------------------------------

## Validating client connections (`onConnect` / `onClose`)<a href="#validating-client-connections-onconnect--onclose" class="hash-link" aria-label="Direct link to validating-client-connections-onconnect--onclose" translate="no" title="Direct link to validating-client-connections-onconnect--onclose">​</a>

Use `onConnect` to accept or reject incoming connections before any SMTP commands are processed. Use `onClose` to perform cleanup when a connection ends.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const server = new SMTPServer({
  onConnect(session, callback) {
    if (session.remoteAddress === "127.0.0.1") {
      return callback(new Error("Connections from localhost are not allowed"));
    }
    callback(); // Accept the connection
  },
  onClose(session) {
    console.log(`Connection from ${session.remoteAddress} closed`);
  },
});
```

</div>

</div>

------------------------------------------------------------------------

## Validating TLS information (`onSecure`)<a href="#validating-tls-information-onsecure" class="hash-link" aria-label="Direct link to validating-tls-information-onsecure" translate="no" title="Direct link to validating-tls-information-onsecure">​</a>

The `onSecure` callback is called after a TLS handshake completes (either from an initially secure connection or after STARTTLS). Use it to validate TLS-specific information like the SNI hostname.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
onSecure(socket, session, callback) {
  if (session.servername !== "mail.example.com") {
    return callback(new Error("SNI mismatch"));
  }
  callback();
}
```

</div>

</div>

------------------------------------------------------------------------

## Validating sender (`onMailFrom`)<a href="#validating-sender-onmailfrom" class="hash-link" aria-label="Direct link to validating-sender-onmailfrom" translate="no" title="Direct link to validating-sender-onmailfrom">​</a>

The `onMailFrom` callback is invoked when the client issues a `MAIL FROM` command. Use it to validate or reject the sender address.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
onMailFrom(address, session, callback) {
  if (!address.address.endsWith("@example.com")) {
    // Include a custom response code by setting responseCode on the error
    return callback(Object.assign(new Error("Relay denied"), { responseCode: 553 }));
  }
  callback();
}
```

</div>

</div>

------------------------------------------------------------------------

## Validating recipients (`onRcptTo`)<a href="#validating-recipients-onrcptto" class="hash-link" aria-label="Direct link to validating-recipients-onrcptto" translate="no" title="Direct link to validating-recipients-onrcptto">​</a>

The `onRcptTo` callback is invoked for each `RCPT TO` command. Use it to validate or reject recipient addresses.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
onRcptTo(address, session, callback) {
  if (address.address === "blackhole@example.com") {
    return callback(new Error("User unknown"));
  }
  callback();
}
```

</div>

</div>

------------------------------------------------------------------------

## Processing incoming messages (`onData`)<a href="#processing-incoming-messages-ondata" class="hash-link" aria-label="Direct link to processing-incoming-messages-ondata" translate="no" title="Direct link to processing-incoming-messages-ondata">​</a>

The `onData` callback receives a readable stream containing the email message data. The message is streamed verbatim as sent by the client. To parse the received message, you can use [MailParser](/extras/mailparser).

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
onData(stream, session, callback) {
  const fs = require("fs");
  const writeStream = fs.createWriteStream("/tmp/message.eml");
  stream.pipe(writeStream);
  stream.on("end", () => callback(null, "Message queued"));
}
```

</div>

</div>

<div class="theme-admonition theme-admonition-note admonition_xJq3 alert alert--secondary">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTQgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTYuMyA1LjY5YS45NDIuOTQyIDAgMCAxLS4yOC0uN2MwLS4yOC4wOS0uNTIuMjgtLjcuMTktLjE4LjQyLS4yOC43LS4yOC4yOCAwIC41Mi4wOS43LjI4LjE4LjE5LjI4LjQyLjI4LjcgMCAuMjgtLjA5LjUyLS4yOC43YTEgMSAwIDAgMS0uNy4zYy0uMjggMC0uNTItLjExLS43LS4zek04IDcuOTljLS4wMi0uMjUtLjExLS40OC0uMzEtLjY5LS4yLS4xOS0uNDItLjMtLjY5LS4zMUg2Yy0uMjcuMDItLjQ4LjEzLS42OS4zMS0uMi4yLS4zLjQ0LS4zMS42OWgxdjNjLjAyLjI3LjExLjUuMzEuNjkuMi4yLjQyLjMxLjY5LjMxaDFjLjI3IDAgLjQ4LS4xMS42OS0uMzEuMi0uMTkuMy0uNDIuMzEtLjY5SDhWNy45OHYuMDF6TTcgMi4zYy0zLjE0IDAtNS43IDIuNTQtNS43IDUuNjggMCAzLjE0IDIuNTYgNS43IDUuNyA1LjdzNS43LTIuNTUgNS43LTUuN2MwLTMuMTUtMi41Ni01LjY5LTUuNy01LjY5di4wMXpNNyAuOThjMy44NiAwIDcgMy4xNCA3IDdzLTMuMTQgNy03IDctNy0zLjEyLTctNyAzLjE0LTcgNy03eiIgLz48L3N2Zz4=)</span>note

</div>

<div class="admonitionContent_BuS1">

*smtp-server* does not add a `Received:` header to the message. If you need RFC 5321 compliance, you must add this header yourself.

</div>

</div>

------------------------------------------------------------------------

## Using the SIZE extension<a href="#using-the-size-extension" class="hash-link" aria-label="Direct link to Using the SIZE extension" translate="no" title="Direct link to Using the SIZE extension">​</a>

Set the `size` option to advertise a maximum message size to clients. Then check `stream.sizeExceeded` in your `onData` handler to detect oversized messages:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const server = new SMTPServer({
  size: 1024 * 1024, // 1 MiB limit
  onData(stream, session, callback) {
    stream.on("end", () => {
      if (stream.sizeExceeded) {
        const err = new Error("Message too large");
        err.responseCode = 552;
        return callback(err);
      }
      callback(null, "OK");
    });
    stream.resume(); // Consume the stream
  },
});
```

</div>

</div>

------------------------------------------------------------------------

## Using LMTP<a href="#using-lmtp" class="hash-link" aria-label="Direct link to Using LMTP" translate="no" title="Direct link to Using LMTP">​</a>

LMTP (Local Mail Transfer Protocol) requires a separate response for each recipient. Return an array from your `onData` callback with one response per recipient:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const server = new SMTPServer({
  lmtp: true,
  onData(stream, session, callback) {
    stream.on("end", () => {
      // Return one response per recipient in the same order as session.envelope.rcptTo
      const replies = session.envelope.rcptTo.map((rcpt, index) =>
        index % 2 === 0
          ? `<${rcpt.address}> accepted`
          : new Error(`<${rcpt.address}> rejected`)
      );
      callback(null, replies);
    });
    stream.resume();
  },
});
```

</div>

</div>

------------------------------------------------------------------------

## Session object<a href="#session-object" class="hash-link" aria-label="Direct link to Session object" translate="no" title="Direct link to Session object">​</a>

The session object contains information about the current connection and is passed to all callback handlers.

| Property | Type | Description |
|----|----|----|
| **id** | `String` | Unique identifier for this connection (randomly generated). |
| **remoteAddress** | `String` | Client's IP address. |
| **clientHostname** | `String` | Reverse DNS hostname of the client (unless `disableReverseLookup` is set). |
| **openingCommand** | `"HELO" | "EHLO" | "LHLO"` | The greeting command sent by the client. |
| **hostNameAppearsAs** | `String` | The hostname the client provided in HELO/EHLO/LHLO. |
| **envelope** | `Object` | Contains `mailFrom`, `rcptTo`, and related transaction data. |
| **user** | `any` | The value returned from your `onAuth` callback after successful login. |
| **transaction** | `Number` | Transaction counter: 1 for the first message, 2 for the second, etc. |
| **transmissionType** | `"SMTP" | "ESMTP" | "ESMTPA" ...` | Transmission type string suitable for `Received:` headers. |

------------------------------------------------------------------------

## Envelope object<a href="#envelope-object" class="hash-link" aria-label="Direct link to Envelope object" translate="no" title="Direct link to Envelope object">​</a>

The `session.envelope` object contains data specific to the current mail transaction:

<div class="language-jsonc codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` jsonc
{
  "mailFrom": {
    "address": "sender@example.com",
    "args": { "SIZE": "12345", "RET": "HDRS", "BODY": "8BITMIME", "SMTPUTF8": true, "REQUIRETLS": true },
    "dsn": { "ret": "HDRS", "envid": "abc123" }
  },
  "rcptTo": [
    {
      "address": "user1@example.com",
      "args": { "NOTIFY": "SUCCESS,FAILURE" },
      "dsn": { "notify": ["SUCCESS", "FAILURE"], "orcpt": "rfc822;user1@example.com" }
    }
  ],
  "bodyType": "8bitmime",
  "smtpUtf8": true,
  "requireTLS": true,
  "dsn": {
    "ret": "HDRS",
    "envid": "abc123"
  }
}
```

</div>

</div>

| Property | Type | Description |
|----|----|----|
| **mailFrom** | `Object` | Sender address object (see Address object below). |
| **rcptTo** | `Object[]` | Array of recipient address objects. |
| **bodyType** | `String` | Message body encoding: `'7bit'` (default) or `'8bitmime'` (RFC 6152). |
| **smtpUtf8** | `Boolean` | `true` if the client requested UTF-8 support (RFC 6531). |
| **requireTLS** | `Boolean` | `true` if TLS is required for the entire delivery chain (RFC 8689). |
| **dsn** | `Object` | DSN parameters from the MAIL FROM command (when DSN is enabled). |

------------------------------------------------------------------------

## Address object<a href="#address-object" class="hash-link" aria-label="Direct link to Address object" translate="no" title="Direct link to Address object">​</a>

Both `mailFrom` and each entry in `rcptTo` are address objects with the following structure:

<div class="language-jsonc codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` jsonc
{
  "address": "sender@example.com",
  "args": {
    "SIZE": "12345",
    "RET": "HDRS"
  },
  "dsn": {
    "ret": "HDRS",
    "envid": "abc123",
    "notify": ["SUCCESS", "FAILURE"],
    "orcpt": "rfc822;original@example.com"
  }
}
```

</div>

</div>

| Field | Description |
|----|----|
| **address** | The email address from the `MAIL FROM:` or `RCPT TO:` command. |
| **args** | Additional SMTP parameters (keys are uppercase). |
| **dsn** | DSN-specific parameters (when DSN is enabled). |

### DSN object properties<a href="#dsn-object-properties" class="hash-link" aria-label="Direct link to DSN object properties" translate="no" title="Direct link to DSN object properties">​</a>

| Property   | Type       | Description                                         |
|------------|------------|-----------------------------------------------------|
| **ret**    | `String`   | Return type: `'FULL'` or `'HDRS'` (from MAIL FROM). |
| **envid**  | `String`   | Envelope identifier (from MAIL FROM).               |
| **notify** | `String[]` | Notification conditions (from RCPT TO).             |
| **orcpt**  | `String`   | Original recipient address (from RCPT TO).          |

------------------------------------------------------------------------

## Enhanced Status Codes (RFC 2034/3463)<a href="#enhanced-status-codes-rfc-20343463" class="hash-link" aria-label="Direct link to Enhanced Status Codes (RFC 2034/3463)" translate="no" title="Direct link to Enhanced Status Codes (RFC 2034/3463)">​</a>

*smtp-server* supports Enhanced Status Codes as defined in RFC 2034 and RFC 3463. When enabled, SMTP responses include a three-part status code in the format `X.Y.Z`:

<div class="language-text codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` text
250 2.1.0 Accepted        <- Enhanced status code: 2.1.0
550 5.1.1 Mailbox unavailable <- Enhanced status code: 5.1.1
```

</div>

</div>

### Enabling enhanced status codes<a href="#enabling-enhanced-status-codes" class="hash-link" aria-label="Direct link to Enabling enhanced status codes" translate="no" title="Direct link to Enabling enhanced status codes">​</a>

Enhanced status codes are **disabled by default**. To enable them:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const server = new SMTPServer({
  hideENHANCEDSTATUSCODES: false, // Enable enhanced status codes
  onMailFrom(address, session, callback) {
    callback(); // Response includes enhanced code: "250 2.1.0 Accepted"
  },
});
```

</div>

</div>

### Disabling enhanced status codes<a href="#disabling-enhanced-status-codes" class="hash-link" aria-label="Direct link to Disabling enhanced status codes" translate="no" title="Direct link to Disabling enhanced status codes">​</a>

Enhanced status codes are disabled by default. You can also explicitly disable them:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const server = new SMTPServer({
  hideENHANCEDSTATUSCODES: true, // Explicitly disable (this is the default)
  onMailFrom(address, session, callback) {
    callback(); // Response: "250 Accepted" (no enhanced code)
  },
});
```

</div>

</div>

### Enhanced status code reference<a href="#enhanced-status-code-reference" class="hash-link" aria-label="Direct link to Enhanced status code reference" translate="no" title="Direct link to Enhanced status code reference">​</a>

| Response Code | Enhanced Code | Description                |
|---------------|---------------|----------------------------|
| `250`         | `2.0.0`       | General success            |
| `250`         | `2.1.0`       | MAIL FROM accepted         |
| `250`         | `2.1.5`       | RCPT TO accepted           |
| `250`         | `2.6.0`       | Message accepted           |
| `501`         | `5.5.4`       | Syntax error in parameters |
| `550`         | `5.1.1`       | Mailbox unavailable        |
| `552`         | `5.2.2`       | Storage exceeded           |

------------------------------------------------------------------------

## DSN (Delivery Status Notification) Support<a href="#dsn-delivery-status-notification-support" class="hash-link" aria-label="Direct link to DSN (Delivery Status Notification) Support" translate="no" title="Direct link to DSN (Delivery Status Notification) Support">​</a>

*smtp-server* supports DSN parameters as defined in RFC 3461, allowing clients to request delivery status notifications.

**Important:** DSN is disabled by default. You must set `hideDSN: false` to enable DSN functionality.

### DSN parameters<a href="#dsn-parameters" class="hash-link" aria-label="Direct link to DSN parameters" translate="no" title="Direct link to DSN parameters">​</a>

#### MAIL FROM parameters<a href="#mail-from-parameters" class="hash-link" aria-label="Direct link to MAIL FROM parameters" translate="no" title="Direct link to MAIL FROM parameters">​</a>

- **`RET=FULL`** or **`RET=HDRS`** - Specifies whether DSN reports should include the full message or headers only
- **`ENVID=<envelope-id>`** - An envelope identifier for tracking purposes

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
// Client sends: MAIL FROM:<sender@example.com> RET=FULL ENVID=abc123
```

</div>

</div>

#### RCPT TO parameters<a href="#rcpt-to-parameters" class="hash-link" aria-label="Direct link to RCPT TO parameters" translate="no" title="Direct link to RCPT TO parameters">​</a>

- **`NOTIFY=SUCCESS,FAILURE,DELAY,NEVER`** - Specifies when to send DSN notifications
- **`ORCPT=<original-recipient>`** - Records the original recipient address for tracking

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
// Client sends: RCPT TO:<user@example.com> NOTIFY=SUCCESS,FAILURE ORCPT=rfc822;user@example.com
```

</div>

</div>

### Accessing DSN parameters<a href="#accessing-dsn-parameters" class="hash-link" aria-label="Direct link to Accessing DSN parameters" translate="no" title="Direct link to Accessing DSN parameters">​</a>

DSN parameters are available in your callback handlers through the session and address objects:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const server = new SMTPServer({
  hideDSN: false, // Required to enable DSN
  onMailFrom(address, session, callback) {
    // Access DSN parameters from MAIL FROM
    const ret = session.envelope.dsn.ret; // 'FULL' or 'HDRS'
    const envid = session.envelope.dsn.envid; // Envelope ID

    console.log(`RET: ${ret}, ENVID: ${envid}`);
    callback();
  },

  onRcptTo(address, session, callback) {
    // Access DSN parameters from RCPT TO
    const notify = address.dsn.notify; // ['SUCCESS', 'FAILURE', 'DELAY']
    const orcpt = address.dsn.orcpt; // Original recipient

    console.log(`NOTIFY: ${notify.join(",")}, ORCPT: ${orcpt}`);
    callback();
  },
});
```

</div>

</div>

### DSN parameter validation<a href="#dsn-parameter-validation" class="hash-link" aria-label="Direct link to DSN parameter validation" translate="no" title="Direct link to DSN parameter validation">​</a>

*smtp-server* automatically validates DSN parameters:

- **`RET`** must be `FULL` or `HDRS`
- **`NOTIFY`** must contain valid values: `SUCCESS`, `FAILURE`, `DELAY`, or `NEVER`
- **`NOTIFY=NEVER`** cannot be combined with other values
- Invalid parameters receive appropriate error responses

### Complete DSN example<a href="#complete-dsn-example" class="hash-link" aria-label="Direct link to Complete DSN example" translate="no" title="Direct link to Complete DSN example">​</a>

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const server = new SMTPServer({
  hideDSN: false, // Required to enable DSN
  onMailFrom(address, session, callback) {
    const { ret, envid } = session.envelope.dsn;
    console.log(`Mail from ${address.address}, RET=${ret}, ENVID=${envid}`);
    callback();
  },

  onRcptTo(address, session, callback) {
    const { notify, orcpt } = address.dsn;
    console.log(`Rcpt to ${address.address}, NOTIFY=${notify.join(",")}, ORCPT=${orcpt}`);
    callback();
  },

  onData(stream, session, callback) {
    // Process message with DSN context
    const { dsn } = session.envelope;
    console.log(`Processing message with DSN: ${JSON.stringify(dsn)}`);

    stream.on("end", () => {
      callback(null, "Message accepted for delivery");
    });
    stream.resume();
  },
});
```

</div>

</div>

### Production DSN implementation example<a href="#production-dsn-implementation-example" class="hash-link" aria-label="Direct link to Production DSN implementation example" translate="no" title="Direct link to Production DSN implementation example">​</a>

Here is a complete example showing how to implement DSN notifications using Nodemailer:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const { SMTPServer } = require("smtp-server");
const nodemailer = require("nodemailer");

// Create a Nodemailer transporter for sending DSN notifications
const dsnTransporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 587,
  secure: false,
  auth: {
    user: "dsn-sender@example.com",
    pass: "your-password",
  },
});

// DSN notification generator
class DSNNotifier {
  constructor(transporter) {
    this.transporter = transporter;
  }

  async sendSuccessNotification(envelope, messageId, deliveryTime) {
    // Only send if SUCCESS notification was requested
    const needsSuccessNotification = envelope.rcptTo.some((rcpt) => rcpt.dsn.notify && rcpt.dsn.notify.includes("SUCCESS"));

    if (!needsSuccessNotification || !envelope.mailFrom.address) {
      return;
    }

    const dsnMessage = this.generateDSNMessage({
      action: "delivered",
      status: "2.0.0",
      envelope,
      messageId,
      deliveryTime,
      diagnosticCode: "smtp; 250 2.0.0 Message accepted for delivery",
    });

    await this.transporter.sendMail({
      from: "postmaster@example.com",
      to: envelope.mailFrom.address,
      subject: "Delivery Status Notification (Success)",
      text: dsnMessage.text,
      headers: {
        "Auto-Submitted": "auto-replied",
        "Content-Type": "multipart/report; report-type=delivery-status",
      },
    });
  }

  generateDSNMessage({ action, status, envelope, messageId, deliveryTime, diagnosticCode }) {
    const { dsn } = envelope;
    const timestamp = deliveryTime || new Date().toISOString();

    // Generate RFC 3464 compliant delivery status notification
    const text = `This is an automatically generated Delivery Status Notification.

Original Message Details:
- Message ID: ${messageId}
- Envelope ID: ${dsn.envid || "Not provided"}
- Sender: ${envelope.mailFrom.address}
- Recipients: ${envelope.rcptTo.map((r) => r.address).join(", ")}
- Action: ${action}
- Status: ${status}
- Time: ${timestamp}

${action === "delivered" ? "Your message has been successfully delivered to all recipients." : "Delivery failed for one or more recipients."}`;

    return { text };
  }
}

// Create DSN notifier instance
const dsnNotifier = new DSNNotifier(dsnTransporter);

// SMTP Server with DSN support
const server = new SMTPServer({
  hideDSN: false, // Required to enable DSN
  name: "mail.example.com",

  onMailFrom(address, session, callback) {
    const { dsn } = session.envelope;
    console.log(`MAIL FROM: ${address.address}, RET=${dsn.ret}, ENVID=${dsn.envid}`);
    callback();
  },

  onRcptTo(address, session, callback) {
    const { notify, orcpt } = address.dsn;
    console.log(`RCPT TO: ${address.address}, NOTIFY=${notify?.join(",")}, ORCPT=${orcpt}`);
    callback();
  },

  async onData(stream, session, callback) {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    stream.on("end", async () => {
      try {
        // Simulate message delivery
        const deliveryTime = new Date();

        // Send DSN success notification if requested
        await dsnNotifier.sendSuccessNotification(session.envelope, messageId, deliveryTime);

        callback(null, `Message ${messageId} accepted for delivery`);
      } catch (error) {
        callback(error);
      }
    });

    stream.resume();
  },
});

server.listen(2525, () => {
  console.log("DSN-enabled SMTP server listening on port 2525");
});
```

</div>

</div>

This example demonstrates:

- **Complete DSN workflow** from parameter parsing to notification sending
- **RFC-compliant DSN messages** with proper headers and content
- **Conditional notifications** based on NOTIFY parameters
- **Integration with Nodemailer** for sending DSN notifications
- **Production-ready structure** with error handling

------------------------------------------------------------------------

## MAIL FROM Parameters (BODY, SMTPUTF8, REQUIRETLS)<a href="#mail-from-parameters-body-smtputf8-requiretls" class="hash-link" aria-label="Direct link to MAIL FROM Parameters (BODY, SMTPUTF8, REQUIRETLS)" translate="no" title="Direct link to MAIL FROM Parameters (BODY, SMTPUTF8, REQUIRETLS)">​</a>

*smtp-server* supports several RFC-compliant MAIL FROM parameters that allow clients to specify message characteristics and delivery requirements.

### BODY parameter (RFC 6152)<a href="#body-parameter-rfc-6152" class="hash-link" aria-label="Direct link to BODY parameter (RFC 6152)" translate="no" title="Direct link to BODY parameter (RFC 6152)">​</a>

The `BODY` parameter specifies the message body encoding type:

- **`BODY=7BIT`** - 7-bit ASCII encoding (the default)
- **`BODY=8BITMIME`** - 8-bit MIME encoding for messages containing non-ASCII characters

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
// Client sends: MAIL FROM:<sender@example.com> BODY=8BITMIME
```

</div>

</div>

The selected body type is available in `session.envelope.bodyType`:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const server = new SMTPServer({
  onMailFrom(address, session, callback) {
    console.log(`Body type: ${session.envelope.bodyType}`); // '7bit' or '8bitmime'
    callback();
  },
});
```

</div>

</div>

**Note:** `BINARYMIME` is not supported because it requires the `BDAT` command (RFC 3030), which is not implemented.

### SMTPUTF8 parameter (RFC 6531)<a href="#smtputf8-parameter-rfc-6531" class="hash-link" aria-label="Direct link to SMTPUTF8 parameter (RFC 6531)" translate="no" title="Direct link to SMTPUTF8 parameter (RFC 6531)">​</a>

The `SMTPUTF8` parameter indicates that the client wants to use UTF-8 encoding in email addresses and headers:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
// Client sends: MAIL FROM:<sender@example.com> SMTPUTF8
```

</div>

</div>

The UTF-8 flag is available in `session.envelope.smtpUtf8`:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const server = new SMTPServer({
  onMailFrom(address, session, callback) {
    if (session.envelope.smtpUtf8) {
      console.log("UTF-8 support requested");
    }
    callback();
  },
});
```

</div>

</div>

### REQUIRETLS parameter (RFC 8689)<a href="#requiretls-parameter-rfc-8689" class="hash-link" aria-label="Direct link to REQUIRETLS parameter (RFC 8689)" translate="no" title="Direct link to REQUIRETLS parameter (RFC 8689)">​</a>

The `REQUIRETLS` parameter indicates that the client requires TLS encryption for the entire delivery chain, not just the client-to-server connection. This is useful when sending sensitive messages that must never be transmitted over unencrypted connections.

**Important:** REQUIRETLS is disabled by default and must be explicitly enabled:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const server = new SMTPServer({
  hideREQUIRETLS: false, // Enable REQUIRETLS support
  onMailFrom(address, session, callback) {
    if (session.envelope.requireTLS) {
      console.log("TLS required for entire delivery chain");
      // Ensure downstream delivery also uses TLS
    }
    callback();
  },
});
```

</div>

</div>

**Requirements:**

- REQUIRETLS is only advertised when the connection is already using TLS (after STARTTLS or on an initially secure connection)
- Clients can only use REQUIRETLS when connected over TLS
- If a client attempts to use REQUIRETLS without TLS, the server returns error code 530

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
// Client sends: MAIL FROM:<sender@example.com> REQUIRETLS
// Server sets: session.envelope.requireTLS === true
```

</div>

</div>

### Combined parameters example<a href="#combined-parameters-example" class="hash-link" aria-label="Direct link to Combined parameters example" translate="no" title="Direct link to Combined parameters example">​</a>

All MAIL FROM parameters can be used together in a single command:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const server = new SMTPServer({
  hideREQUIRETLS: false, // Enable REQUIRETLS
  onMailFrom(address, session, callback) {
    const { bodyType, smtpUtf8, requireTLS } = session.envelope;

    console.log(`
      Body Type: ${bodyType}
      UTF-8: ${smtpUtf8}
      Require TLS: ${requireTLS}
    `);

    // Validate requirements
    if (requireTLS && !session.secure) {
      return callback(new Error("TLS required but not established"));
    }

    callback();
  },
});
```

</div>

</div>

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
// Client sends: MAIL FROM:<sender@example.com> BODY=8BITMIME SMTPUTF8 REQUIRETLS
```

</div>

</div>

### Parameter validation<a href="#parameter-validation" class="hash-link" aria-label="Direct link to Parameter validation" translate="no" title="Direct link to Parameter validation">​</a>

*smtp-server* automatically validates all MAIL FROM parameters:

- **BODY** must be `7BIT` or `8BITMIME` (case-insensitive)
- **SMTPUTF8** is a flag parameter and must not have a value
- **REQUIRETLS** is a flag parameter and must not have a value
- **REQUIRETLS** can only be used over TLS connections

Invalid parameters return appropriate error codes (501 for syntax errors, 530 for TLS requirement violations).

------------------------------------------------------------------------

## Supported commands and extensions<a href="#supported-commands-and-extensions" class="hash-link" aria-label="Direct link to Supported commands and extensions" translate="no" title="Direct link to Supported commands and extensions">​</a>

### Commands<a href="#commands" class="hash-link" aria-label="Direct link to Commands" translate="no" title="Direct link to Commands">​</a>

- `EHLO` / `HELO` - Session initialization
- `AUTH` - Authentication (`LOGIN`, `PLAIN`, `XOAUTH2`\*, `CRAM-MD5`\*)
- `MAIL` / `RCPT` / `DATA` - Mail transaction commands
- `RSET` / `NOOP` / `QUIT` / `VRFY` - Session management
- `HELP` - Returns a reference to RFC 5321
- `STARTTLS` - Upgrade connection to TLS

\* `XOAUTH2` and `CRAM-MD5` must be explicitly enabled via the `authMethods` option.

### Extensions<a href="#extensions" class="hash-link" aria-label="Direct link to Extensions" translate="no" title="Direct link to Extensions">​</a>

- `PIPELINING` - Allows command pipelining for improved performance
- `8BITMIME` (RFC 6152) - 8-bit MIME message support
- `SMTPUTF8` (RFC 6531) - UTF-8 support in email addresses and headers
- `SIZE` - Message size declaration and limit enforcement
- `DSN` (RFC 3461) - Delivery Status Notifications (opt-in via `hideDSN: false`)
- `ENHANCEDSTATUSCODES` (RFC 2034/3463) - Enhanced status codes (opt-in via `hideENHANCEDSTATUSCODES: false`)
- `REQUIRETLS` (RFC 8689) - Require TLS for delivery chain (opt-in via `hideREQUIRETLS: false`)

<div class="theme-admonition theme-admonition-note admonition_xJq3 alert alert--secondary">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTQgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTYuMyA1LjY5YS45NDIuOTQyIDAgMCAxLS4yOC0uN2MwLS4yOC4wOS0uNTIuMjgtLjcuMTktLjE4LjQyLS4yOC43LS4yOC4yOCAwIC41Mi4wOS43LjI4LjE4LjE5LjI4LjQyLjI4LjcgMCAuMjgtLjA5LjUyLS4yOC43YTEgMSAwIDAgMS0uNy4zYy0uMjggMC0uNTItLjExLS43LS4zek04IDcuOTljLS4wMi0uMjUtLjExLS40OC0uMzEtLjY5LS4yLS4xOS0uNDItLjMtLjY5LS4zMUg2Yy0uMjcuMDItLjQ4LjEzLS42OS4zMS0uMi4yLS4zLjQ0LS4zMS42OWgxdjNjLjAyLjI3LjExLjUuMzEuNjkuMi4yLjQyLjMxLjY5LjMxaDFjLjI3IDAgLjQ4LS4xMS42OS0uMzEuMi0uMTkuMy0uNDIuMzEtLjY5SDhWNy45OHYuMDF6TTcgMi4zYy0zLjE0IDAtNS43IDIuNTQtNS43IDUuNjggMCAzLjE0IDIuNTYgNS43IDUuNyA1LjdzNS43LTIuNTUgNS43LTUuN2MwLTMuMTUtMi41Ni01LjY5LTUuNy01LjY5di4wMXpNNyAuOThjMy44NiAwIDcgMy4xNCA3IDdzLTMuMTQgNy03IDctNy0zLjEyLTctNyAzLjE0LTcgNy03eiIgLz48L3N2Zz4=)</span>note

</div>

<div class="admonitionContent_BuS1">

The `CHUNKING` extension (BDAT command) is **not** implemented.

</div>

</div>

------------------------------------------------------------------------

## License<a href="#license" class="hash-link" aria-label="Direct link to License" translate="no" title="Direct link to License">​</a>

<a href="https://github.com/nodemailer/nodemailer/blob/master/LICENSE" target="_blank" rel="noopener noreferrer">MIT</a>

</div>

<a href="/extras" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

Extra modules

</div>

<a href="/extras/smtp-connection" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

SMTP Connection

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#usage" class="table-of-contents__link toc-highlight">Usage</a>
  - <a href="#1-install" class="table-of-contents__link toc-highlight">1. Install</a>
  - <a href="#2-require-in-your-script" class="table-of-contents__link toc-highlight">2. Require in your script</a>
  - <a href="#3-create-a-server-instance" class="table-of-contents__link toc-highlight">3. Create a server instance</a>
  - <a href="#4-start-listening" class="table-of-contents__link toc-highlight">4. Start listening</a>
  - <a href="#5-shut-down" class="table-of-contents__link toc-highlight">5. Shut down</a>
- <a href="#options-reference" class="table-of-contents__link toc-highlight">Options reference</a>
- <a href="#customizing-greetings" class="table-of-contents__link toc-highlight">Customizing greetings</a>
  - <a href="#initial-connection-banner" class="table-of-contents__link toc-highlight">Initial connection banner</a>
  - <a href="#heloehlo-response" class="table-of-contents__link toc-highlight">HELO/EHLO response</a>
- <a href="#tls-and-starttls" class="table-of-contents__link toc-highlight">TLS and STARTTLS</a>
- <a href="#handling-errors" class="table-of-contents__link toc-highlight">Handling errors</a>
- <a href="#handling-authentication-onauth" class="table-of-contents__link toc-highlight">Handling authentication (<code>onAuth</code>)</a>
  - <a href="#password-based-authentication-plain--login" class="table-of-contents__link toc-highlight">Password-based authentication (PLAIN / LOGIN)</a>
  - <a href="#oauth-2-authentication-xoauth2" class="table-of-contents__link toc-highlight">OAuth 2 authentication (<code>XOAUTH2</code>)</a>
- <a href="#validating-client-connections-onconnect--onclose" class="table-of-contents__link toc-highlight">Validating client connections (<code>onConnect</code> / <code>onClose</code>)</a>
- <a href="#validating-tls-information-onsecure" class="table-of-contents__link toc-highlight">Validating TLS information (<code>onSecure</code>)</a>
- <a href="#validating-sender-onmailfrom" class="table-of-contents__link toc-highlight">Validating sender (<code>onMailFrom</code>)</a>
- <a href="#validating-recipients-onrcptto" class="table-of-contents__link toc-highlight">Validating recipients (<code>onRcptTo</code>)</a>
- <a href="#processing-incoming-messages-ondata" class="table-of-contents__link toc-highlight">Processing incoming messages (<code>onData</code>)</a>
- <a href="#using-the-size-extension" class="table-of-contents__link toc-highlight">Using the SIZE extension</a>
- <a href="#using-lmtp" class="table-of-contents__link toc-highlight">Using LMTP</a>
- <a href="#session-object" class="table-of-contents__link toc-highlight">Session object</a>
- <a href="#envelope-object" class="table-of-contents__link toc-highlight">Envelope object</a>
- <a href="#address-object" class="table-of-contents__link toc-highlight">Address object</a>
  - <a href="#dsn-object-properties" class="table-of-contents__link toc-highlight">DSN object properties</a>
- <a href="#enhanced-status-codes-rfc-20343463" class="table-of-contents__link toc-highlight">Enhanced Status Codes (RFC 2034/3463)</a>
  - <a href="#enabling-enhanced-status-codes" class="table-of-contents__link toc-highlight">Enabling enhanced status codes</a>
  - <a href="#disabling-enhanced-status-codes" class="table-of-contents__link toc-highlight">Disabling enhanced status codes</a>
  - <a href="#enhanced-status-code-reference" class="table-of-contents__link toc-highlight">Enhanced status code reference</a>
- <a href="#dsn-delivery-status-notification-support" class="table-of-contents__link toc-highlight">DSN (Delivery Status Notification) Support</a>
  - <a href="#dsn-parameters" class="table-of-contents__link toc-highlight">DSN parameters</a>
  - <a href="#accessing-dsn-parameters" class="table-of-contents__link toc-highlight">Accessing DSN parameters</a>
  - <a href="#dsn-parameter-validation" class="table-of-contents__link toc-highlight">DSN parameter validation</a>
  - <a href="#complete-dsn-example" class="table-of-contents__link toc-highlight">Complete DSN example</a>
  - <a href="#production-dsn-implementation-example" class="table-of-contents__link toc-highlight">Production DSN implementation example</a>
- <a href="#mail-from-parameters-body-smtputf8-requiretls" class="table-of-contents__link toc-highlight">MAIL FROM Parameters (BODY, SMTPUTF8, REQUIRETLS)</a>
  - <a href="#body-parameter-rfc-6152" class="table-of-contents__link toc-highlight">BODY parameter (RFC 6152)</a>
  - <a href="#smtputf8-parameter-rfc-6531" class="table-of-contents__link toc-highlight">SMTPUTF8 parameter (RFC 6531)</a>
  - <a href="#requiretls-parameter-rfc-8689" class="table-of-contents__link toc-highlight">REQUIRETLS parameter (RFC 8689)</a>
  - <a href="#combined-parameters-example" class="table-of-contents__link toc-highlight">Combined parameters example</a>
  - <a href="#parameter-validation" class="table-of-contents__link toc-highlight">Parameter validation</a>
- <a href="#supported-commands-and-extensions" class="table-of-contents__link toc-highlight">Supported commands and extensions</a>
  - <a href="#commands" class="table-of-contents__link toc-highlight">Commands</a>
  - <a href="#extensions" class="table-of-contents__link toc-highlight">Extensions</a>
- <a href="#license" class="table-of-contents__link toc-highlight">License</a>

</div>

</div>

</div>

</div>

</div>
