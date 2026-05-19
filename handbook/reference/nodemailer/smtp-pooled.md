<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <a href="/smtp" class="breadcrumbs__link"><span>SMTP transport</span></a>
- <span class="breadcrumbs__link">Pooled SMTP Connections</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# Pooled SMTP Connections

</div>

**Pooled SMTP** maintains a fixed number of persistent TCP/TLS connections to your SMTP server and reuses them across multiple messages. Instead of opening a new connection for each email (which requires a full TLS handshake every time), pooled connections stay open and ready for the next message. This is an extension of the standard [SMTP transport](/smtp).

This approach is ideal when:

- You need to send a **large batch of emails** quickly, since connection reuse eliminates repeated TLS handshake overhead.
- Your SMTP provider **limits the number of simultaneous connections** you can open, and you need to queue messages efficiently within those limits.

<div class="theme-admonition theme-admonition-tip admonition_xJq3 alert alert--success">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTIgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTYuNSAwQzMuNDggMCAxIDIuMTkgMSA1YzAgLjkyLjU1IDIuMjUgMSAzIDEuMzQgMi4yNSAxLjc4IDIuNzggMiA0djFoNXYtMWMuMjItMS4yMi42Ni0xLjc1IDItNCAuNDUtLjc1IDEtMi4wOCAxLTMgMC0yLjgxLTIuNDgtNS01LjUtNXptMy42NCA3LjQ4Yy0uMjUuNDQtLjQ3LjgtLjY3IDEuMTEtLjg2IDEuNDEtMS4yNSAyLjA2LTEuNDUgMy4yMy0uMDIuMDUtLjAyLjExLS4wMi4xN0g1YzAtLjA2IDAtLjEzLS4wMi0uMTctLjItMS4xNy0uNTktMS44My0xLjQ1LTMuMjMtLjItLjMxLS40Mi0uNjctLjY3LTEuMTFDMi40NCA2Ljc4IDIgNS42NSAyIDVjMC0yLjIgMi4wMi00IDQuNS00IDEuMjIgMCAyLjM2LjQyIDMuMjIgMS4xOUMxMC41NSAyLjk0IDExIDMuOTQgMTEgNWMwIC42Ni0uNDQgMS43OC0uODYgMi40OHpNNCAxNGg1Yy0uMjMgMS4xNC0xLjMgMi0yLjUgMnMtMi4yNy0uODYtMi41LTJ6IiAvPjwvc3ZnPg==)</span>tip

</div>

<div class="admonitionContent_BuS1">

For extremely high-volume email sending, consider using the [SES transport](/transports/ses) which integrates with Amazon Simple Email Service and handles rate limiting and deliverability at scale.

</div>

</div>

------------------------------------------------------------------------

## Quick example<a href="#quick-example" class="hash-link" aria-label="Direct link to Quick example" translate="no" title="Direct link to Quick example">​</a>

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const nodemailer = require("nodemailer");

// Create ONE transporter instance and reuse it throughout your application.
// The transporter manages up to `maxConnections` persistent connections internally.
const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 465,
  secure: true,
  pool: true, // Enable connection pooling
  maxConnections: 5, // Maximum number of simultaneous connections (default: 5)
  maxMessages: 100, // Messages per connection before reconnecting (default: 100)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Send emails using the shared transporter.
// Do NOT create a new transporter for each message - that defeats the purpose of pooling.
await transporter.sendMail({
  from: "Newsletters <noreply@example.com>",
  to: "alice@example.com",
  subject: "Hello pooled world",
  text: "Hi Alice!",
});
```

</div>

</div>

<div class="theme-admonition theme-admonition-info admonition_xJq3 alert alert--info">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTQgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTcgMi4zYzMuMTQgMCA1LjcgMi41NiA1LjcgNS43cy0yLjU2IDUuNy01LjcgNS43QTUuNzEgNS43MSAwIDAgMSAxLjMgOGMwLTMuMTQgMi41Ni01LjcgNS43LTUuN3pNNyAxQzMuMTQgMSAwIDQuMTQgMCA4czMuMTQgNyA3IDcgNy0zLjE0IDctNy0zLjE0LTctNy03em0xIDNINnY1aDJWNHptMCA2SDZ2Mmgydi0yeiIgLz48L3N2Zz4=)</span>info

</div>

<div class="admonitionContent_BuS1">

Pooled connections work with all authentication methods, including [OAuth2](/smtp/oauth2). This is particularly useful when sending through services like Gmail or Outlook that support OAuth2.

</div>

</div>

------------------------------------------------------------------------

## Transport options<a href="#transport-options" class="hash-link" aria-label="Direct link to Transport options" translate="no" title="Direct link to Transport options">​</a>

| Option | Type | Default | Description |
|----|----|----|----|
| `pool` | `boolean` | `false` | Set to `true` to enable connection pooling. |
| `maxConnections` | `number` | `5` | The maximum number of SMTP connections to open simultaneously. Messages are queued when all connections are busy. |
| `maxMessages` | `number` | `100` | How many messages to send on a single connection before closing and reopening it. This helps prevent long-lived connections from becoming stale. |
| `maxRequeues` | `number` | `-1` | How many times a message can be re-added to the queue if its connection closes unexpectedly mid-send. Set to `-1` (or omit) to allow unlimited retry attempts, or set to `0` to disable re-queuing entirely. |

<div class="theme-admonition theme-admonition-warning admonition_xJq3 alert alert--warning">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTYgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTguODkzIDEuNWMtLjE4My0uMzEtLjUyLS41LS44ODctLjVzLS43MDMuMTktLjg4Ni41TC4xMzggMTMuNDk5YS45OC45OCAwIDAgMCAwIDEuMDAxYy4xOTMuMzEuNTMuNTAxLjg4Ni41MDFoMTMuOTY0Yy4zNjcgMCAuNzA0LS4xOS44NzctLjVhMS4wMyAxLjAzIDAgMCAwIC4wMS0xLjAwMkw4Ljg5MyAxLjV6bS4xMzMgMTEuNDk3SDYuOTg3di0yLjAwM2gyLjAzOXYyLjAwM3ptMC0zLjAwNEg2Ljk4N1Y1Ljk4N2gyLjAzOXY0LjAwNnoiIC8+PC9zdmc+)</span>Deprecated

</div>

<div class="admonitionContent_BuS1">

The following options are **deprecated** and will be removed in a future major release:

- `rateDelta` - The time window in milliseconds used for rate limiting (default: `1000`).
- `rateLimit` - The maximum number of messages that can be sent within one `rateDelta` window. This limit applies across all pooled connections combined, not per connection.

</div>

</div>

------------------------------------------------------------------------

## Runtime helpers<a href="#runtime-helpers" class="hash-link" aria-label="Direct link to Runtime helpers" translate="no" title="Direct link to Runtime helpers">​</a>

### `transporter.isIdle()` -\> `boolean`<a href="#transporterisidle---boolean" class="hash-link" aria-label="Direct link to transporterisidle---boolean" translate="no" title="Direct link to transporterisidle---boolean">​</a>

Returns `true` when the transporter has capacity to accept more messages. This means either the internal queue has room, or at least one connection is available to send immediately.

### `transporter.close()`<a href="#transporterclose" class="hash-link" aria-label="Direct link to transporterclose" translate="no" title="Direct link to transporterclose">​</a>

Closes all active connections and clears any pending messages from the queue. Connections that have been idle will close automatically after `socketTimeout`, so calling `close()` manually is typically only needed during application shutdown.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
// Graceful shutdown example
process.on("SIGTERM", () => {
  transporter.close();
  process.exit(0);
});
```

</div>

</div>

------------------------------------------------------------------------

## Event: `idle`<a href="#event-idle" class="hash-link" aria-label="Direct link to event-idle" translate="no" title="Direct link to event-idle">​</a>

The transporter emits an `idle` event whenever it has capacity to accept more messages (either the queue has room or a connection becomes available). This enables a pull-based approach where you fetch messages from an external queue only when Nodemailer is ready to handle them, rather than loading everything into memory upfront:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const { getNextMessage } = require("./messageQueue");

transporter.on("idle", async () => {
  // Keep sending while the transporter can accept more messages
  while (transporter.isIdle()) {
    const message = await getNextMessage();
    if (!message) return; // External queue is empty

    try {
      await transporter.sendMail(message);
    } catch (err) {
      console.error("Failed to send:", err);
    }
  }
});
```

</div>

</div>

------------------------------------------------------------------------

### Best practices<a href="#best-practices" class="hash-link" aria-label="Direct link to Best practices" translate="no" title="Direct link to Best practices">​</a>

- **Create one transporter and reuse it throughout your application.** Each call to `createTransport()` creates a separate pool with its own connections. Creating multiple transporters defeats the purpose of pooling.
- **Match `maxConnections` and `maxMessages` to your SMTP provider's limits.** Many providers restrict the number of concurrent connections or messages per connection. Check your provider's documentation or the [well-known services list](/smtp/well-known-services) for common providers.
- **Use the `idle` event for high-volume sending.** Instead of queuing thousands of messages in memory, use the pull-based pattern shown above to fetch messages only when the transporter is ready.
- **Close the pool during application shutdown.** Call `transporter.close()` in your shutdown handler to ensure connections are properly terminated and your process can exit cleanly.

</div>

<a href="/smtp/oauth2" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

OAuth2

</div>

<a href="/smtp/envelope" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

SMTP envelope

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#quick-example" class="table-of-contents__link toc-highlight">Quick example</a>
- <a href="#transport-options" class="table-of-contents__link toc-highlight">Transport options</a>
- <a href="#runtime-helpers" class="table-of-contents__link toc-highlight">Runtime helpers</a>
  - <a href="#transporterisidle---boolean" class="table-of-contents__link toc-highlight"><code>transporter.isIdle()</code> -&gt; <code>boolean</code></a>
  - <a href="#transporterclose" class="table-of-contents__link toc-highlight"><code>transporter.close()</code></a>
- <a href="#event-idle" class="table-of-contents__link toc-highlight">Event: <code>idle</code></a>
  - <a href="#best-practices" class="table-of-contents__link toc-highlight">Best practices</a>

</div>

</div>

</div>

</div>

</div>
