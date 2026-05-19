<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <a href="/plugins" class="breadcrumbs__link"><span>Plugins</span></a>
- <span class="breadcrumbs__link">Create plugins</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# Create plugins

</div>

Nodemailer provides three extension points in the email delivery pipeline where you can attach [plugins](/plugins) to customize behavior:

1.  **`compile`** - Runs immediately after `sendMail()` is called, before Nodemailer builds the MIME tree. Use this stage to modify `mail.data` (for example, to transform HTML content, add custom headers, or set default values).
2.  **`stream`** - Runs after the MIME tree is fully constructed but before the message bytes are streamed out. At this stage you can modify the `mail.message` object directly or insert transform streams to process the raw message data.
3.  **Transport** - The final stage where the raw message stream is delivered to its destination. Custom [transports](/transports) implement this stage to define how messages are actually sent.

------------------------------------------------------------------------

## Attaching `compile` and `stream` plugins<a href="#attaching-compile-and-stream-plugins" class="hash-link" aria-label="Direct link to attaching-compile-and-stream-plugins" translate="no" title="Direct link to attaching-compile-and-stream-plugins">​</a>

To register a plugin, call the `use()` method on your transporter:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
transporter.use(step, pluginFn);
```

</div>

</div>

| Parameter | Type | Description |
|----|----|----|
| `transporter` | `Object` | A transporter instance created with `nodemailer.createTransport()` |
| `step` | `String` | The pipeline stage: either `'compile'` or `'stream'` |
| `pluginFn` | `Function(mail, done)` | Your plugin function (see the Plugin API section below) |

You can register multiple plugins for the same stage. They will execute in the order they were added.

------------------------------------------------------------------------

## Plugin API<a href="#plugin-api" class="hash-link" aria-label="Direct link to Plugin API" translate="no" title="Direct link to Plugin API">​</a>

Every plugin function, including custom transport `send` methods, receives two arguments:

1.  **`mail`** - An object containing information about the message being processed (see the table below).
2.  **`done`** - A callback function with the signature `function(err)`. You **must** call this when your plugin finishes. Pass an `Error` object to abort the send operation, or call it with no arguments to continue processing.

### The `mail` object<a href="#the-mail-object" class="hash-link" aria-label="Direct link to the-mail-object" translate="no" title="Direct link to the-mail-object">​</a>

| Property | Available at | Description |
|----|----|----|
| `data` | `compile`, `stream`, **transport** | The original options object passed to `sendMail()` |
| `message` | `stream`, **transport** | A <a href="https://github.com/nodemailer/nodemailer/blob/master/lib/mime-node/index.js" target="_blank" rel="noopener noreferrer"><code>MimeNode</code></a> instance representing the built message (see also [MailComposer](/extras/mailcomposer)) |
| `resolveContent` | `compile`, `stream`, **transport** | A helper method for converting Nodemailer content objects (streams, file paths, URLs) into a `String` or `Buffer` |

### `mail.resolveContent(obj, key, callback)`<a href="#mailresolvecontentobj-key-callback" class="hash-link" aria-label="Direct link to mailresolvecontentobj-key-callback" translate="no" title="Direct link to mailresolvecontentobj-key-callback">​</a>

Use this method to convert any <a href="https://nodemailer.com/message/attachments/#possible-content-types" target="_blank" rel="noopener noreferrer">Nodemailer content type</a> (file path, URL, Stream, Buffer, etc.) into a plain `String` or `Buffer`. This is useful when you need to read and process content that might come from various sources.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
mail.resolveContent(sourceObject, propertyName, (err, value) => {
  if (err) return done(err);
  // value is a String or Buffer depending on the input type
});
```

</div>

</div>

#### Example: Log the final HTML string<a href="#example-log-the-final-html-string" class="hash-link" aria-label="Direct link to Example: Log the final HTML string" translate="no" title="Direct link to Example: Log the final HTML string">​</a>

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
function plugin(mail, done) {
  mail.resolveContent(mail.data, "html", (err, html) => {
    if (err) return done(err);
    console.log("HTML contents: %s", html.toString());
    done();
  });
}
```

</div>

</div>

------------------------------------------------------------------------

## `compile` plugins<a href="#compile-plugins" class="hash-link" aria-label="Direct link to compile-plugins" translate="no" title="Direct link to compile-plugins">​</a>

At the `compile` stage, only `mail.data` is available. The `mail.message` property does **not** exist yet because the MIME tree has not been built. You can freely modify `mail.data` and then call `done()` when finished. Passing an error to `done(err)` will abort the `sendMail()` operation.

#### Example: Generate plain text from HTML if missing<a href="#example-generate-plain-text-from-html-if-missing" class="hash-link" aria-label="Direct link to Example: Generate plain text from HTML if missing" translate="no" title="Direct link to Example: Generate plain text from HTML if missing">​</a>

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
transporter.use("compile", (mail, done) => {
  if (!mail.data.text && mail.data.html) {
    mail.data.text = mail.data.html.replace(/<[^>]*>/g, " ");
  }
  done();
});
```

</div>

</div>

------------------------------------------------------------------------

## `stream` plugins<a href="#stream-plugins" class="hash-link" aria-label="Direct link to stream-plugins" translate="no" title="Direct link to stream-plugins">​</a>

`stream` plugins run **after** the MIME tree is fully built but **before** any bytes are sent to the transport. At this stage you can:

- Modify `mail.message` directly (for example, to add or change headers)
- Pipe the output through additional Transform streams using `mail.message.transform()`

<div class="theme-admonition theme-admonition-note admonition_xJq3 alert alert--secondary">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTQgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTYuMyA1LjY5YS45NDIuOTQyIDAgMCAxLS4yOC0uN2MwLS4yOC4wOS0uNTIuMjgtLjcuMTktLjE4LjQyLS4yOC43LS4yOC4yOCAwIC41Mi4wOS43LjI4LjE4LjE5LjI4LjQyLjI4LjcgMCAuMjgtLjA5LjUyLS4yOC43YTEgMSAwIDAgMS0uNy4zYy0uMjggMC0uNTItLjExLS43LS4zek04IDcuOTljLS4wMi0uMjUtLjExLS40OC0uMzEtLjY5LS4yLS4xOS0uNDItLjMtLjY5LS4zMUg2Yy0uMjcuMDItLjQ4LjEzLS42OS4zMS0uMi4yLS4zLjQ0LS4zMS42OWgxdjNjLjAyLjI3LjExLjUuMzEuNjkuMi4yLjQyLjMxLjY5LjMxaDFjLjI3IDAgLjQ4LS4xMS42OS0uMzEuMi0uMTkuMy0uNDIuMzEtLjY5SDhWNy45OHYuMDF6TTcgMi4zYy0zLjE0IDAtNS43IDIuNTQtNS43IDUuNjggMCAzLjE0IDIuNTYgNS43IDUuNyA1LjdzNS43LTIuNTUgNS43LTUuN2MwLTMuMTUtMi41Ni01LjY5LTUuNy01LjY5di4wMXpNNyAuOThjMy44NiAwIDcgMy4xNCA3IDdzLTMuMTQgNy03IDctNy0zLjEyLTctNyAzLjE0LTcgNy03eiIgLz48L3N2Zz4=)</span>note

</div>

<div class="admonitionContent_BuS1">

Modifying `mail.data` at this stage usually has **no effect** because the MIME tree has already been built from it. The exception is if your custom transport explicitly reads properties from `mail.data`.

</div>

</div>

### Example: Replace all tabs with spaces in the outgoing stream<a href="#example-replace-all-tabs-with-spaces-in-the-outgoing-stream" class="hash-link" aria-label="Direct link to Example: Replace all tabs with spaces in the outgoing stream" translate="no" title="Direct link to Example: Replace all tabs with spaces in the outgoing stream">​</a>

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const { Transform } = require("stream");

const tabToSpace = new Transform();

tabToSpace._transform = function (chunk, _enc, cb) {
  for (let i = 0; i < chunk.length; ++i) {
    if (chunk[i] === 0x09) chunk[i] = 0x20; // 0x09 = TAB, 0x20 = space
  }
  this.push(chunk);
  cb();
};

transporter.use("stream", (mail, done) => {
  mail.message.transform(tabToSpace);
  done();
});
```

</div>

</div>

### Example: Log all address fields<a href="#example-log-all-address-fields" class="hash-link" aria-label="Direct link to Example: Log all address fields" translate="no" title="Direct link to Example: Log all address fields">​</a>

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
transporter.use("stream", (mail, done) => {
  const a = mail.message.getAddresses();
  console.log("From :", JSON.stringify(a.from));
  console.log("To   :", JSON.stringify(a.to));
  console.log("Cc   :", JSON.stringify(a.cc));
  console.log("Bcc  :", JSON.stringify(a.bcc));
  done();
});
```

</div>

</div>

------------------------------------------------------------------------

### `mail.message.transform(transformStream)`<a href="#mailmessagetransformtransformstream" class="hash-link" aria-label="Direct link to mailmessagetransformtransformstream" translate="no" title="Direct link to mailmessagetransformtransformstream">​</a>

Adds a <a href="https://nodejs.org/api/stream.html#class-streamtransform" target="_blank" rel="noopener noreferrer"><code>stream.Transform</code></a> through which the raw message is piped **before** it reaches the transport. You can also pass a function that returns a Transform stream.

### `mail.message.getAddresses()`<a href="#mailmessagegetaddresses" class="hash-link" aria-label="Direct link to mailmessagegetaddresses" translate="no" title="Direct link to mailmessagegetaddresses">​</a>

Returns an object containing parsed email addresses from the **From**, **Sender**, **Reply-To**, **To**, **Cc**, and **Bcc** headers. Each property is an **array** of objects with `{ name, address }` structure. If a header is not present in the message, that property will be omitted from the result.

------------------------------------------------------------------------

## Writing a custom transport<a href="#transports" class="hash-link" aria-label="Direct link to Writing a custom transport" translate="no" title="Direct link to Writing a custom transport">​</a>

A transport is an object that defines how messages are actually delivered. For built-in options, see [SMTP transport](/smtp) and [other transports](/transports). To create your own, implement an object with three properties: **`name`**, **`version`**, and a **`send(mail, done)`** method. Pass this object to `nodemailer.createTransport()` to create a working transporter.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const nodemailer = require("nodemailer");

const transport = {
  name: require("./package.json").name, // e.g. "SMTP"
  version: require("./package.json").version, // e.g. "1.0.0"

  /**
   * Sends the message.
   * @param {Object} mail - The same `mail` object that plugins receive
   * @param {Function} done - Callback with signature `(err, info)`
   */
  send(mail, done) {
    const input = mail.message.createReadStream();
    const envelope = mail.message.getEnvelope();
    const messageId = mail.message.messageId();

    // For demonstration, we pipe the message to stdout
    input.pipe(process.stdout);
    input.on("end", () => {
      done(null, {
        envelope,
        messageId,
      });
    });
  },

  /**
   * Optional: Clean up resources when the transporter is closed.
   * Useful for closing long-lived connections (e.g., pooled SMTP).
   */
  close() {
    // Release resources here
  },

  /**
   * Optional: Report whether the transport is idle.
   * Used by connection pooling. Return `true` when the transport
   * has capacity to send more messages immediately.
   */
  isIdle() {
    return true;
  },
};

const transporter = nodemailer.createTransport(transport);

transporter.sendMail(
  {
    from: "sender@example.com",
    to: "receiver@example.com",
    subject: "Hello",
    text: "Hello world!",
  },
  console.log
);
```

</div>

</div>

------------------------------------------------------------------------

## Summary<a href="#summary" class="hash-link" aria-label="Direct link to Summary" translate="no" title="Direct link to Summary">​</a>

1.  Choose the stage (`compile`, `stream`, or custom **transport**) that best fits your needs.
2.  Write a plugin function that accepts **`(mail, done)`** and register it with `transporter.use()`, or implement `transport.send()` for a custom transport.
3.  Always call `done()` when your plugin completes. Pass an `Error` to abort the send operation.

</div>

<a href="/plugins" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

Plugins

</div>

<a href="/extras" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

Extra modules

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#attaching-compile-and-stream-plugins" class="table-of-contents__link toc-highlight">Attaching <code>compile</code> and <code>stream</code> plugins</a>
- <a href="#plugin-api" class="table-of-contents__link toc-highlight">Plugin API</a>
  - <a href="#the-mail-object" class="table-of-contents__link toc-highlight">The <code>mail</code> object</a>
  - <a href="#mailresolvecontentobj-key-callback" class="table-of-contents__link toc-highlight"><code>mail.resolveContent(obj, key, callback)</code></a>
- <a href="#compile-plugins" class="table-of-contents__link toc-highlight"><code>compile</code> plugins</a>
- <a href="#stream-plugins" class="table-of-contents__link toc-highlight"><code>stream</code> plugins</a>
  - <a href="#example-replace-all-tabs-with-spaces-in-the-outgoing-stream" class="table-of-contents__link toc-highlight">Example: Replace all tabs with spaces in the outgoing stream</a>
  - <a href="#example-log-all-address-fields" class="table-of-contents__link toc-highlight">Example: Log all address fields</a>
  - <a href="#mailmessagetransformtransformstream" class="table-of-contents__link toc-highlight"><code>mail.message.transform(transformStream)</code></a>
  - <a href="#mailmessagegetaddresses" class="table-of-contents__link toc-highlight"><code>mail.message.getAddresses()</code></a>
- <a href="#transports" class="table-of-contents__link toc-highlight">Writing a custom transport</a>
- <a href="#summary" class="table-of-contents__link toc-highlight">Summary</a>

</div>

</div>

</div>

</div>

</div>
