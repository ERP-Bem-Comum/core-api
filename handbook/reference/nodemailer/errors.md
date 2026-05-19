<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <span class="breadcrumbs__link">Error reference</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# Error reference

</div>

This page documents all error codes and error types that Nodemailer and related packages can produce. Understanding these errors will help you diagnose issues and implement proper error handling in your application.

## Error object structure<a href="#error-object-structure" class="hash-link" aria-label="Direct link to Error object structure" translate="no" title="Direct link to Error object structure">​</a>

When Nodemailer encounters an error, it creates an Error object with additional properties that provide context about what went wrong.

| Property | Type | Description |
|----|----|----|
| `message` | `string` | A human-readable description of the error. |
| `code` | `string` | An error code that identifies the type of error (such as `ECONNECTION` or `EAUTH`). |
| `command` | `string` | The SMTP command that was being executed when the error occurred (such as `CONN`, `AUTH LOGIN`). |
| `response` | `string` | The raw response string from the SMTP server, if available. |
| `responseCode` | `number` | The numeric SMTP response code from the server (such as `535` for authentication failure). |

Example error object:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
{
  message: 'Invalid login: 535 5.7.8 Authentication failed',
  code: 'EAUTH',
  command: 'AUTH PLAIN',
  response: '535 5.7.8 Authentication failed',
  responseCode: 535
}
```

</div>

</div>

## Error codes<a href="#error-codes" class="hash-link" aria-label="Direct link to Error codes" translate="no" title="Direct link to Error codes">​</a>

Nodemailer uses specific error codes to categorize different types of failures. These codes are set on the `error.code` property.

### Quick reference<a href="#quick-reference" class="hash-link" aria-label="Direct link to Quick reference" translate="no" title="Direct link to Quick reference">​</a>

| Code          | Category       | Description                         |
|---------------|----------------|-------------------------------------|
| `ECONNECTION` | Connection     | Connection closed unexpectedly      |
| `ETIMEDOUT`   | Connection     | Connection or operation timed out   |
| `EDNS`        | Connection     | DNS resolution failed               |
| `ESOCKET`     | Connection     | Socket-level error                  |
| `ETLS`        | TLS/Security   | TLS handshake or STARTTLS failed    |
| `EREQUIRETLS` | TLS/Security   | REQUIRETLS not supported (RFC 8689) |
| `EAUTH`       | Authentication | Authentication failed               |
| `ENOAUTH`     | Authentication | Authentication not provided         |
| `EOAUTH2`     | Authentication | OAuth2 token error                  |
| `EENVELOPE`   | Envelope       | Invalid mail envelope               |
| `EMESSAGE`    | Message        | Message delivery error              |
| `ESTREAM`     | Stream         | Stream processing error             |
| `EPROTOCOL`   | Protocol       | Invalid SMTP server response        |
| `EMAXLIMIT`   | Pool           | Pool resource limit reached         |
| `ECONFIG`     | Configuration  | Invalid configuration               |
| `EPROXY`      | Proxy          | Proxy connection error              |
| `EFILEACCESS` | Content        | File access rejected                |
| `EURLACCESS`  | Content        | URL access rejected                 |
| `EFETCH`      | Content        | HTTP fetch error                    |
| `ESENDMAIL`   | Transport      | Sendmail command error              |
| `ESES`        | Transport      | AWS SES error                       |

### Connection errors<a href="#connection-errors" class="hash-link" aria-label="Direct link to Connection errors" translate="no" title="Direct link to Connection errors">​</a>

#### ECONNECTION<a href="#econnection" class="hash-link" aria-label="Direct link to ECONNECTION" translate="no" title="Direct link to ECONNECTION">​</a>

A general connection error occurred. This typically happens when:

- The connection to the SMTP server failed to establish
- The connection was closed unexpectedly during a transaction
- The server terminated the connection (response code 421)
- The socket encountered an error

**Common causes:**

- Incorrect hostname or port configuration
- Firewall blocking the connection
- Server is down or unreachable
- Network connectivity issues

**Troubleshooting:**

- Verify the `host` and `port` settings in your transport configuration
- Check if your network allows outbound connections on the specified port
- Try using `telnet hostname port` to test basic connectivity
- Ensure the SMTP server is running and accepting connections

#### ETIMEDOUT<a href="#etimedout" class="hash-link" aria-label="Direct link to ETIMEDOUT" translate="no" title="Direct link to ETIMEDOUT">​</a>

The operation timed out. This can occur in several scenarios:

- Connection timeout: Failed to establish TCP connection within the allowed time
- Greeting timeout: Server did not send initial greeting after connection was established
- Socket timeout: No activity on the connection for too long

**Default timeout values:**

- Connection timeout: 2 minutes (120000 ms)
- Greeting timeout: 30 seconds (30000 ms)
- Socket timeout: 10 minutes (600000 ms)

**Troubleshooting:**

- Increase timeout values in your transport configuration if network is slow
- Check for network latency issues between your server and the SMTP server
- Verify that the SMTP server is responsive

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 587,
  connectionTimeout: 60000, // 1 minute
  greetingTimeout: 30000,   // 30 seconds
  socketTimeout: 300000,    // 5 minutes
});
```

</div>

</div>

#### EDNS<a href="#edns" class="hash-link" aria-label="Direct link to EDNS" translate="no" title="Direct link to EDNS">​</a>

DNS resolution failed. The hostname could not be resolved to an IP address.

**Common causes:**

- Incorrect hostname (typo in the domain name)
- DNS server is unreachable
- The domain does not exist

**Troubleshooting:**

- Verify the hostname is correct
- Test DNS resolution: `nslookup smtp.example.com`
- Check your DNS server configuration

#### ESOCKET<a href="#esocket" class="hash-link" aria-label="Direct link to ESOCKET" translate="no" title="Direct link to ESOCKET">​</a>

A low-level socket error occurred. This is typically an error passed through from Node.js net or tls modules.

**Common causes:**

- Network interruption during communication
- Connection reset by peer (ECONNRESET)
- Broken pipe (EPIPE)

### TLS/SSL errors<a href="#tlsssl-errors" class="hash-link" aria-label="Direct link to TLS/SSL errors" translate="no" title="Direct link to TLS/SSL errors">​</a>

#### ETLS<a href="#etls" class="hash-link" aria-label="Direct link to ETLS" translate="no" title="Direct link to ETLS">​</a>

A TLS-related error occurred. This can happen during:

- Initial TLS connection (when using `secure: true` with port 465)
- STARTTLS upgrade (when upgrading from unencrypted to encrypted connection)
- TLS certificate validation

**Common causes:**

- Invalid or self-signed TLS certificate
- Certificate hostname mismatch
- TLS version incompatibility
- STARTTLS command failed

**Troubleshooting:**

- For self-signed certificates in development, use `tls: { rejectUnauthorized: false }`
- Ensure the server certificate is valid and not expired
- Set `tls.servername` if connecting via IP address
- Check if the server supports your TLS version

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 465,
  secure: true,
  tls: {
    // Do not fail on invalid certs (use only in development!)
    rejectUnauthorized: false,
    // Specify server name for SNI
    servername: "smtp.example.com",
  },
});
```

</div>

</div>

### Authentication errors<a href="#authentication-errors" class="hash-link" aria-label="Direct link to Authentication errors" translate="no" title="Direct link to Authentication errors">​</a>

#### EAUTH<a href="#eauth" class="hash-link" aria-label="Direct link to EAUTH" translate="no" title="Direct link to EAUTH">​</a>

Authentication failed. The server rejected the provided credentials or authentication method.

**Common causes:**

- Incorrect username or password
- Account is locked or disabled
- Authentication method not supported by server
- OAuth2 token expired or invalid
- Two-factor authentication enabled without app-specific password

**The `command` property indicates which authentication step failed:**

- `AUTH LOGIN` - LOGIN authentication method
- `AUTH PLAIN` - PLAIN authentication method
- `AUTH CRAM-MD5` - CRAM-MD5 authentication method
- `AUTH XOAUTH2` - OAuth2 authentication

**Troubleshooting:**

- Verify your username and password are correct
- For Gmail, use an App Password if 2FA is enabled
- For OAuth2, ensure your access token is valid and not expired
- Check if the server supports your chosen authentication method

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
// Using App Password for Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "your.email@gmail.com",
    pass: "your-16-char-app-password", // Not your regular password!
  },
});
```

</div>

</div>

#### ENOAUTH<a href="#enoauth" class="hash-link" aria-label="Direct link to ENOAUTH" translate="no" title="Direct link to ENOAUTH">​</a>

Authentication credentials were not provided when the server requires authentication (and `forceAuth` option is set).

**Troubleshooting:**

- Add the `auth` object to your transport configuration
- Ensure both `user` and `pass` properties are set

#### EOAUTH2<a href="#eoauth2" class="hash-link" aria-label="Direct link to EOAUTH2" translate="no" title="Direct link to EOAUTH2">​</a>

An OAuth2-specific error occurred during token generation or refresh.

**Common causes:**

- Missing required options (`privateKey` and `user` for service accounts)
- Refresh token is invalid or revoked
- JWT signing failed
- OAuth server returned an error response
- No access token in server response

**Troubleshooting:**

- Verify your OAuth2 credentials are correct
- Check if the refresh token is still valid
- For service accounts, ensure the private key is properly formatted
- Review the error message for specific OAuth server error details

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
// OAuth2 configuration example
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: "your.email@gmail.com",
    clientId: "your-client-id",
    clientSecret: "your-client-secret",
    refreshToken: "your-refresh-token",
  },
});
```

</div>

</div>

### Envelope errors<a href="#envelope-errors" class="hash-link" aria-label="Direct link to Envelope errors" translate="no" title="Direct link to Envelope errors">​</a>

#### EENVELOPE<a href="#eenvelope" class="hash-link" aria-label="Direct link to EENVELOPE" translate="no" title="Direct link to EENVELOPE">​</a>

The message envelope is invalid. This relates to the MAIL FROM and RCPT TO commands.

**Common causes:**

- No recipients defined (empty `to`, `cc`, and `bcc`)
- Invalid sender address format
- Invalid recipient address format
- All recipients were rejected by the server
- Server rejected the sender address
- Internationalized email addresses when server does not support SMTPUTF8

**Error scenarios:**

- `No recipients defined` - No valid recipients in the envelope
- `Invalid sender` - The from address contains invalid characters
- `Invalid recipient` - A recipient address contains invalid characters
- `Can't send mail - all recipients were rejected` - Server rejected every recipient
- `Mail command failed` - Server rejected the sender address
- `Recipient command failed` - Server rejected a recipient address
- `Data command failed` - Server rejected the DATA command
- `Internationalized mailbox name not allowed` - Unicode address used without SMTPUTF8 support

**Troubleshooting:**

- Ensure at least one recipient is specified
- Verify email addresses do not contain special characters like `<`, `>`, or newlines
- Check server logs for why addresses were rejected
- For rejected recipients, check the `rejected` and `rejectedErrors` arrays in the error

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
try {
  await transporter.sendMail(message);
} catch (err) {
  if (err.code === 'EENVELOPE') {
    console.log('Rejected recipients:', err.rejected);
    console.log('Rejection details:', err.rejectedErrors);
  }
}
```

</div>

</div>

### Message errors<a href="#message-errors" class="hash-link" aria-label="Direct link to Message errors" translate="no" title="Direct link to Message errors">​</a>

#### EMESSAGE<a href="#emessage" class="hash-link" aria-label="Direct link to EMESSAGE" translate="no" title="Direct link to EMESSAGE">​</a>

The message content is invalid or was rejected by the server.

**Common causes:**

- Empty message body
- Message size exceeds server limit
- Server rejected the message after DATA command
- Message content violated server policies

**Troubleshooting:**

- Ensure message has content (text or html body)
- Check if message size exceeds the server's SIZE limit
- Review message content for policy violations (spam filters, etc.)

### Stream errors<a href="#stream-errors" class="hash-link" aria-label="Direct link to Stream errors" translate="no" title="Direct link to Stream errors">​</a>

#### ESTREAM<a href="#estream" class="hash-link" aria-label="Direct link to ESTREAM" translate="no" title="Direct link to ESTREAM">​</a>

An error occurred while reading the message stream. This typically happens when using streams for message content or attachments.

**Common causes:**

- Source stream emitted an error
- File not found when using file path for attachment
- Network error when fetching URL content

**Troubleshooting:**

- Verify file paths exist and are readable
- Handle stream errors before passing to Nodemailer
- Check network connectivity for URL-based content

### Protocol errors<a href="#protocol-errors" class="hash-link" aria-label="Direct link to Protocol errors" translate="no" title="Direct link to Protocol errors">​</a>

#### EPROTOCOL<a href="#eprotocol" class="hash-link" aria-label="Direct link to EPROTOCOL" translate="no" title="Direct link to EPROTOCOL">​</a>

The server response did not follow the expected SMTP protocol format.

**Common causes:**

- Invalid greeting response (not starting with 220)
- Invalid EHLO/HELO response
- Unexpected response to a command
- Server is not actually an SMTP server

**Troubleshooting:**

- Verify you are connecting to an SMTP server (not HTTP, IMAP, etc.)
- Check the port number is correct for SMTP
- Review server logs for protocol issues

### Pool-specific errors<a href="#pool-specific-errors" class="hash-link" aria-label="Direct link to Pool-specific errors" translate="no" title="Direct link to Pool-specific errors">​</a>

#### EMAXLIMIT<a href="#emaxlimit" class="hash-link" aria-label="Direct link to EMAXLIMIT" translate="no" title="Direct link to EMAXLIMIT">​</a>

The connection pool has reached its maximum number of connections or send retries.

**Common causes:**

- All pooled connections are busy
- Maximum retry limit reached after connection failures
- Connection pool is exhausted

**Troubleshooting:**

- Increase `maxConnections` in pool configuration
- Reduce message sending rate
- Check for connection leaks (connections not being released)

### Configuration errors<a href="#configuration-errors" class="hash-link" aria-label="Direct link to Configuration errors" translate="no" title="Direct link to Configuration errors">​</a>

#### ECONFIG<a href="#econfig" class="hash-link" aria-label="Direct link to ECONFIG" translate="no" title="Direct link to ECONFIG">​</a>

The transport configuration is invalid or uses a deprecated format.

**Common causes:**

- Using legacy SES configuration format (pre-v7.0.0)
- Invalid transport options

**Troubleshooting:**

- Update your configuration to use the current API format
- For SES, use `@aws-sdk/client-sesv2` instead of the legacy SDK
- Review the Nodemailer documentation for current options

### Proxy errors<a href="#proxy-errors" class="hash-link" aria-label="Direct link to Proxy errors" translate="no" title="Direct link to Proxy errors">​</a>

#### EPROXY<a href="#eproxy" class="hash-link" aria-label="Direct link to EPROXY" translate="no" title="Direct link to EPROXY">​</a>

An error occurred while connecting through a proxy server.

**Common causes:**

- Invalid proxy URL or configuration
- Proxy server returned an error response
- SOCKS module not loaded for SOCKS proxy
- Unknown proxy protocol

**Troubleshooting:**

- Verify your proxy URL is correct (e.g., `http://proxy.example.com:3128`)
- For SOCKS proxies, ensure the `socks` module is installed
- Check proxy server logs for connection issues

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 587,
  proxy: "http://proxy.example.com:3128",
});
```

</div>

</div>

### Content access errors<a href="#content-access-errors" class="hash-link" aria-label="Direct link to Content access errors" translate="no" title="Direct link to Content access errors">​</a>

#### EFILEACCESS<a href="#efileaccess" class="hash-link" aria-label="Direct link to EFILEACCESS" translate="no" title="Direct link to EFILEACCESS">​</a>

File access was rejected because `disableFileAccess` option is enabled.

**When this occurs:**

- Attempting to use a file path for attachment content when `disableFileAccess: true`
- This is a security feature to prevent reading local files

**Troubleshooting:**

- If you need file attachments, set `disableFileAccess: false` (default)
- Use Buffer or stream content instead of file paths

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
// This will throw EFILEACCESS if disableFileAccess is true
const message = {
  attachments: [{ path: "/path/to/file.pdf" }],
};

// Safe alternative - use content directly
const message = {
  attachments: [{ content: fs.readFileSync("/path/to/file.pdf") }],
};
```

</div>

</div>

#### EURLACCESS<a href="#eurlaccess" class="hash-link" aria-label="Direct link to EURLACCESS" translate="no" title="Direct link to EURLACCESS">​</a>

URL access was rejected because `disableUrlAccess` option is enabled.

**When this occurs:**

- Attempting to use a URL for attachment content when `disableUrlAccess: true`
- This is a security feature to prevent fetching remote content

**Troubleshooting:**

- If you need URL-based attachments, set `disableUrlAccess: false` (default)
- Fetch the content yourself and pass it as a Buffer

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
// This will throw EURLACCESS if disableUrlAccess is true
const message = {
  attachments: [{ href: "https://example.com/file.pdf" }],
};
```

</div>

</div>

#### EFETCH<a href="#efetch" class="hash-link" aria-label="Direct link to EFETCH" translate="no" title="Direct link to EFETCH">​</a>

An HTTP fetch error occurred when retrieving remote content.

**Common causes:**

- Network error while fetching URL content
- HTTP request timeout
- Invalid status code from server
- Maximum redirect count exceeded

**Troubleshooting:**

- Verify the URL is accessible
- Check network connectivity
- Ensure the server returns a successful status code

### TLS extension errors<a href="#tls-extension-errors" class="hash-link" aria-label="Direct link to TLS extension errors" translate="no" title="Direct link to TLS extension errors">​</a>

#### EREQUIRETLS<a href="#erequiretls" class="hash-link" aria-label="Direct link to EREQUIRETLS" translate="no" title="Direct link to EREQUIRETLS">​</a>

The REQUIRETLS extension (RFC 8689) was requested but not supported by the server.

**When this occurs:**

- `requireTLSExtensionEnabled: true` is set in the message options
- The SMTP server does not advertise REQUIRETLS capability

**Troubleshooting:**

- Check if your SMTP server supports RFC 8689 REQUIRETLS
- Remove `requireTLSExtensionEnabled` option if the server does not support it
- Use a server that supports REQUIRETLS for high-security email delivery

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const message = {
  from: "sender@example.com",
  to: "recipient@example.com",
  subject: "Secure message",
  text: "This requires TLS throughout delivery",
  requireTLSExtensionEnabled: true, // Requires server support
};
```

</div>

</div>

### Transport-specific errors<a href="#transport-specific-errors" class="hash-link" aria-label="Direct link to Transport-specific errors" translate="no" title="Direct link to Transport-specific errors">​</a>

#### ESENDMAIL<a href="#esendmail" class="hash-link" aria-label="Direct link to ESENDMAIL" translate="no" title="Direct link to ESENDMAIL">​</a>

An error occurred with the sendmail transport.

**Common causes:**

- Sendmail binary not found (exit code 127)
- Sendmail process exited with non-zero code
- Invalid envelope addresses (addresses starting with `-`)
- Sendmail binary could not be spawned

**Troubleshooting:**

- Verify sendmail is installed and in the system PATH
- Check the sendmail path configuration
- Ensure envelope addresses are valid

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const transporter = nodemailer.createTransport({
  sendmail: true,
  path: "/usr/sbin/sendmail", // Explicit path if needed
});
```

</div>

</div>

#### ESES<a href="#eses" class="hash-link" aria-label="Direct link to ESES" translate="no" title="Direct link to ESES">​</a>

An error occurred with the AWS SES transport. These are typically errors passed through from the AWS SDK.

## SMTP response codes<a href="#smtp-response-codes" class="hash-link" aria-label="Direct link to SMTP response codes" translate="no" title="Direct link to SMTP response codes">​</a>

When communicating with SMTP servers, you may receive numeric response codes. The `responseCode` property on errors contains this value.

### Success codes (2xx)<a href="#success-codes-2xx" class="hash-link" aria-label="Direct link to Success codes (2xx)" translate="no" title="Direct link to Success codes (2xx)">​</a>

| Code | Meaning                                   |
|------|-------------------------------------------|
| 220  | Service ready                             |
| 221  | Service closing transmission channel      |
| 235  | Authentication successful                 |
| 250  | Requested mail action completed           |
| 251  | User not local; will forward              |
| 252  | Cannot VRFY user, but will accept message |
| 354  | Start mail input                          |

### Temporary failure codes (4xx)<a href="#temporary-failure-codes-4xx" class="hash-link" aria-label="Direct link to Temporary failure codes (4xx)" translate="no" title="Direct link to Temporary failure codes (4xx)">​</a>

These indicate temporary failures. The operation may succeed if retried later.

| Code | Meaning                                              |
|------|------------------------------------------------------|
| 421  | Service not available, closing transmission channel  |
| 450  | Requested mail action not taken: mailbox unavailable |
| 451  | Requested action aborted: local error in processing  |
| 452  | Requested action not taken: insufficient storage     |
| 454  | Temporary authentication failure                     |

### Permanent failure codes (5xx)<a href="#permanent-failure-codes-5xx" class="hash-link" aria-label="Direct link to Permanent failure codes (5xx)" translate="no" title="Direct link to Permanent failure codes (5xx)">​</a>

These indicate permanent failures. The operation will not succeed without changes.

| Code | Meaning |
|----|----|
| 500 | Syntax error, command unrecognized |
| 501 | Syntax error in parameters or arguments |
| 502 | Command not implemented |
| 503 | Bad sequence of commands |
| 504 | Command parameter not implemented |
| 530 | Authentication required |
| 535 | Authentication credentials invalid |
| 538 | Encryption required for requested authentication mechanism |
| 550 | Requested action not taken: mailbox unavailable (not found, no access) |
| 551 | User not local; please try forwarding |
| 552 | Requested mail action aborted: exceeded storage allocation |
| 553 | Requested action not taken: mailbox name not allowed (invalid syntax) |
| 554 | Transaction failed (or no SMTP service here) |
| 555 | MAIL FROM/RCPT TO parameters not recognized |

## SES transport errors<a href="#ses-transport-errors" class="hash-link" aria-label="Direct link to SES transport errors" translate="no" title="Direct link to SES transport errors">​</a>

When using the Amazon SES transport, errors have the code `ESES` and include the underlying AWS SDK error. Common SES error codes include:

| Code | Meaning |
|----|----|
| `InvalidParameterValue` | Invalid parameter in the API request |
| `MessageRejected` | SES rejected the message (content policy violation) |

## Sendmail transport errors<a href="#sendmail-transport-errors" class="hash-link" aria-label="Direct link to Sendmail transport errors" translate="no" title="Direct link to Sendmail transport errors">​</a>

When using the sendmail transport, errors have the code `ESENDMAIL`. Errors are generated based on the sendmail process exit code:

| Exit Code | Error Message                                            |
|-----------|----------------------------------------------------------|
| 127       | Sendmail command not found, process exited with code 127 |
| Other     | Sendmail exited with code X                              |

Additional sendmail errors:

- `Can not send mail. Invalid envelope addresses.` - Address starts with `-` (security risk)
- `sendmail was not found` - Sendmail binary could not be spawned

## OAuth2 errors<a href="#oauth2-errors" class="hash-link" aria-label="Direct link to OAuth2 errors" translate="no" title="Direct link to OAuth2 errors">​</a>

When using OAuth2 authentication, errors have the code `EOAUTH2`. Common error messages include:

| Error Message | Cause |
|----|----|
| `Can't create new access token for user` | No refresh mechanism available and token expired |
| `Can't generate token. Check your auth options` | JWT signing failed (service account) |
| `Invalid authentication response` | OAuth server returned invalid response |
| `No access token` | OAuth server response did not include access token |
| `Options "privateKey" and "user" are required...` | Missing required options for service account |

OAuth error responses from the server follow RFC 6749 format and are included in the error message:

<div class="language-text codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` text
error: error_description (error_uri)
```

</div>

</div>

## Error handling best practices<a href="#error-handling-best-practices" class="hash-link" aria-label="Direct link to Error handling best practices" translate="no" title="Direct link to Error handling best practices">​</a>

### Basic error handling<a href="#basic-error-handling" class="hash-link" aria-label="Direct link to Basic error handling" translate="no" title="Direct link to Basic error handling">​</a>

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
try {
  const info = await transporter.sendMail(message);
  console.log('Message sent:', info.messageId);
} catch (err) {
  console.error('Send failed:', err.message);
  console.error('Error code:', err.code);

  if (err.responseCode) {
    console.error('SMTP response:', err.responseCode, err.response);
  }
}
```

</div>

</div>

### Handling specific error types<a href="#handling-specific-error-types" class="hash-link" aria-label="Direct link to Handling specific error types" translate="no" title="Direct link to Handling specific error types">​</a>

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
try {
  await transporter.sendMail(message);
} catch (err) {
  switch (err.code) {
    case 'ECONNECTION':
    case 'ETIMEDOUT':
    case 'EDNS':
    case 'ESOCKET':
      console.error('Network error - will retry later');
      // Schedule retry
      break;

    case 'EAUTH':
    case 'ENOAUTH':
      console.error('Authentication failed - check credentials');
      // Do not retry without fixing credentials
      break;

    case 'EOAUTH2':
      console.error('OAuth2 error - check token configuration');
      // Refresh token or re-authenticate
      break;

    case 'EENVELOPE':
      console.error('Invalid recipients:', err.rejected);
      // Remove invalid recipients and retry
      break;

    case 'EMESSAGE':
      console.error('Message rejected by server');
      // Check message content
      break;

    case 'ETLS':
    case 'EREQUIRETLS':
      console.error('TLS/Security error');
      // Check TLS configuration
      break;

    case 'ECONFIG':
      console.error('Configuration error');
      // Review transport configuration
      break;

    case 'ESENDMAIL':
      console.error('Sendmail error');
      // Check sendmail installation
      break;

    default:
      console.error('Unexpected error:', err);
  }
}
```

</div>

</div>

### Verifying configuration before sending<a href="#verifying-configuration-before-sending" class="hash-link" aria-label="Direct link to Verifying configuration before sending" translate="no" title="Direct link to Verifying configuration before sending">​</a>

Use `transporter.verify()` to test your configuration:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
try {
  await transporter.verify();
  console.log('Server is ready to accept messages');
} catch (err) {
  console.error('Configuration error:', err.message);
}
```

</div>

</div>

### Handling partial failures<a href="#handling-partial-failures" class="hash-link" aria-label="Direct link to Handling partial failures" translate="no" title="Direct link to Handling partial failures">​</a>

When some recipients are rejected but others accepted:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const info = await transporter.sendMail(message);

if (info.rejected && info.rejected.length > 0) {
  console.log('Message sent, but some recipients were rejected:');
  console.log('Accepted:', info.accepted);
  console.log('Rejected:', info.rejected);

  if (info.rejectedErrors) {
    info.rejectedErrors.forEach(err => {
      console.log(`  ${err.recipient}: ${err.message}`);
    });
  }
}
```

</div>

</div>

</div>

<a href="/extras/mailcomposer" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

Mailcomposer

</div>

<a href="/license" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

License

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#error-object-structure" class="table-of-contents__link toc-highlight">Error object structure</a>
- <a href="#error-codes" class="table-of-contents__link toc-highlight">Error codes</a>
  - <a href="#quick-reference" class="table-of-contents__link toc-highlight">Quick reference</a>
  - <a href="#connection-errors" class="table-of-contents__link toc-highlight">Connection errors</a>
  - <a href="#tlsssl-errors" class="table-of-contents__link toc-highlight">TLS/SSL errors</a>
  - <a href="#authentication-errors" class="table-of-contents__link toc-highlight">Authentication errors</a>
  - <a href="#envelope-errors" class="table-of-contents__link toc-highlight">Envelope errors</a>
  - <a href="#message-errors" class="table-of-contents__link toc-highlight">Message errors</a>
  - <a href="#stream-errors" class="table-of-contents__link toc-highlight">Stream errors</a>
  - <a href="#protocol-errors" class="table-of-contents__link toc-highlight">Protocol errors</a>
  - <a href="#pool-specific-errors" class="table-of-contents__link toc-highlight">Pool-specific errors</a>
  - <a href="#configuration-errors" class="table-of-contents__link toc-highlight">Configuration errors</a>
  - <a href="#proxy-errors" class="table-of-contents__link toc-highlight">Proxy errors</a>
  - <a href="#content-access-errors" class="table-of-contents__link toc-highlight">Content access errors</a>
  - <a href="#tls-extension-errors" class="table-of-contents__link toc-highlight">TLS extension errors</a>
  - <a href="#transport-specific-errors" class="table-of-contents__link toc-highlight">Transport-specific errors</a>
- <a href="#smtp-response-codes" class="table-of-contents__link toc-highlight">SMTP response codes</a>
  - <a href="#success-codes-2xx" class="table-of-contents__link toc-highlight">Success codes (2xx)</a>
  - <a href="#temporary-failure-codes-4xx" class="table-of-contents__link toc-highlight">Temporary failure codes (4xx)</a>
  - <a href="#permanent-failure-codes-5xx" class="table-of-contents__link toc-highlight">Permanent failure codes (5xx)</a>
- <a href="#ses-transport-errors" class="table-of-contents__link toc-highlight">SES transport errors</a>
- <a href="#sendmail-transport-errors" class="table-of-contents__link toc-highlight">Sendmail transport errors</a>
- <a href="#oauth2-errors" class="table-of-contents__link toc-highlight">OAuth2 errors</a>
- <a href="#error-handling-best-practices" class="table-of-contents__link toc-highlight">Error handling best practices</a>
  - <a href="#basic-error-handling" class="table-of-contents__link toc-highlight">Basic error handling</a>
  - <a href="#handling-specific-error-types" class="table-of-contents__link toc-highlight">Handling specific error types</a>
  - <a href="#verifying-configuration-before-sending" class="table-of-contents__link toc-highlight">Verifying configuration before sending</a>
  - <a href="#handling-partial-failures" class="table-of-contents__link toc-highlight">Handling partial failures</a>

</div>

</div>

</div>

</div>

</div>
