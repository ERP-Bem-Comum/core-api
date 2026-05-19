<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <a href="/smtp" class="breadcrumbs__link"><span>SMTP transport</span></a>
- <span class="breadcrumbs__link">Proxy support</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# Proxy support

</div>

Nodemailer can route [SMTP](/smtp) connections **through an outbound proxy server**. This is useful when your application runs behind a corporate firewall or when you need to route traffic through a specific network path. Proxy support works with both single connections and [pooled connections](/smtp/pooled).

Nodemailer includes built-in support for **HTTP CONNECT** proxies. For **SOCKS4/4a/5** proxies or other protocols, you have two options:

1.  Install the <a href="https://www.npmjs.com/package/socks" target="_blank" rel="noopener noreferrer"><code>socks</code></a> package and Nodemailer will use it automatically.
2.  Write a custom proxy handler function for specialized requirements.

## Quick start<a href="#quick-start" class="hash-link" aria-label="Direct link to Quick start" translate="no" title="Direct link to Quick start">​</a>

To use a proxy, set the `proxy` option to a URL string when creating your transporter. Nodemailer parses the URL and automatically determines how to establish the tunnel.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 465,
  secure: true,
  proxy: "http://proxy.example.test:3128", // HTTP proxy URL
});
```

</div>

</div>

## HTTP CONNECT proxies<a href="#http-connect-proxies" class="hash-link" aria-label="Direct link to HTTP CONNECT proxies" translate="no" title="Direct link to HTTP CONNECT proxies">​</a>

HTTP CONNECT proxies work out of the box with **no additional dependencies**. Nodemailer supports both `http://` and `https://` proxy URLs. If your proxy requires authentication, include the credentials in the URL (for example, `http://user:pass@proxy.example.com:3128`).

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 465,
  secure: true,
  proxy: process.env.HTTP_PROXY, // You can also use HTTPS_PROXY
});
```

</div>

</div>

## SOCKS proxies<a href="#socks-proxies" class="hash-link" aria-label="Direct link to SOCKS proxies" translate="no" title="Direct link to SOCKS proxies">​</a>

SOCKS proxy support is **not bundled** with Nodemailer to keep the package lightweight. To use SOCKS proxies, you need to install the `socks` package separately and register it with the transporter.

First, install the package:

<div class="language-bash codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` bash
npm install socks --save
```

</div>

</div>

Then configure the transporter and register the SOCKS module:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 465,
  secure: true,
  proxy: "socks5://127.0.0.1:1080",
});

// Register the socks module so Nodemailer can use it
transporter.set("proxy_socks_module", require("socks"));
```

</div>

</div>

### Supported URL protocols<a href="#supported-url-protocols" class="hash-link" aria-label="Direct link to Supported URL protocols" translate="no" title="Direct link to Supported URL protocols">​</a>

Use one of the following URL schemes depending on your proxy type:

| Protocol   | Proxy type | Description                                 |
|------------|------------|---------------------------------------------|
| `socks4:`  | SOCKS4     | Basic SOCKS4 protocol                       |
| `socks4a:` | SOCKS4a    | SOCKS4 with remote DNS resolution           |
| `socks5:`  | SOCKS5     | SOCKS5 with authentication and IPv6 support |
| `socks:`   | SOCKS5     | Alias for `socks5:`                         |

### Local testing with SSH<a href="#local-testing-with-ssh" class="hash-link" aria-label="Direct link to Local testing with SSH" translate="no" title="Direct link to Local testing with SSH">​</a>

You can create a quick SOCKS5 proxy for testing by using SSH dynamic port forwarding. This tunnels all traffic through an SSH connection to a remote server.

Run this command to start the proxy:

<div class="language-bash codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` bash
ssh -N -D 0.0.0.0:1080 user@remote.host
```

</div>

</div>

The `-N` flag tells SSH not to execute a remote command (just forward ports), and `-D 0.0.0.0:1080` creates a SOCKS proxy listening on port 1080.

Then configure Nodemailer to use this proxy:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
proxy: "socks5://localhost:1080"
```

</div>

</div>

## Custom proxy handlers<a href="#custom-proxy-handlers" class="hash-link" aria-label="Direct link to Custom proxy handlers" translate="no" title="Direct link to Custom proxy handlers">​</a>

If you need special authentication, a proprietary protocol, or any other custom proxy logic, you can write your own handler function. This gives you full control over how the socket connection is established.

To register a custom handler, use `transporter.set()` with a key in the format `proxy_handler_<protocol>`, where `<protocol>` matches the URL scheme you use in the `proxy` option.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const transporter = nodemailer.createTransport({
  host: "smtp.example.com",
  port: 465,
  secure: true,
  proxy: "myproxy://127.0.0.1:9999",
});

// Register a handler for the "myproxy:" URL scheme
transporter.set("proxy_handler_myproxy", (proxy, options, done) => {
  const net = require("net");

  console.log("Connecting to proxy at %s:%s", proxy.hostname, proxy.port);

  const socket = net.connect(proxy.port, proxy.hostname, () => {
    // Perform any custom handshake with your proxy here...

    // Return the established socket to Nodemailer
    done(null, { connection: socket });
  });
});
```

</div>

</div>

The handler function receives three arguments:

- `proxy` - A parsed URL object containing the proxy address details
- `options` - Connection options including the target `host` and `port`
- `done` - A callback to invoke with `(error, result)` when the connection is ready

### Pre-encrypted connections<a href="#pre-encrypted-connections" class="hash-link" aria-label="Direct link to Pre-encrypted connections" translate="no" title="Direct link to Pre-encrypted connections">​</a>

If your proxy connection is **already encrypted** (for example, you used `tls.connect()` instead of `net.connect()`), you must set `secured: true` in the result object. This tells Nodemailer that the connection is already secure and it should not attempt a STARTTLS upgrade.

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const tls = require("tls");

transporter.set("proxy_handler_myproxys", (proxy, options, done) => {
  const socket = tls.connect(proxy.port, proxy.hostname, () => {
    // The secured flag indicates the connection is already TLS-encrypted
    done(null, { connection: socket, secured: true });
  });
});
```

</div>

</div>

</div>

<a href="/smtp/envelope" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

SMTP envelope

</div>

<a href="/smtp/customauth" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

Custom authentication

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#quick-start" class="table-of-contents__link toc-highlight">Quick start</a>
- <a href="#http-connect-proxies" class="table-of-contents__link toc-highlight">HTTP CONNECT proxies</a>
- <a href="#socks-proxies" class="table-of-contents__link toc-highlight">SOCKS proxies</a>
  - <a href="#supported-url-protocols" class="table-of-contents__link toc-highlight">Supported URL protocols</a>
  - <a href="#local-testing-with-ssh" class="table-of-contents__link toc-highlight">Local testing with SSH</a>
- <a href="#custom-proxy-handlers" class="table-of-contents__link toc-highlight">Custom proxy handlers</a>
  - <a href="#pre-encrypted-connections" class="table-of-contents__link toc-highlight">Pre-encrypted connections</a>

</div>

</div>

</div>

</div>

</div>
