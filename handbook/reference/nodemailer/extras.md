<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <span class="breadcrumbs__link">Extra modules</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# Extra modules

</div>

In addition to Nodemailer itself, several companion libraries extend what you can do with email in Node.js. These tools help you receive incoming mail, compose messages programmatically, parse raw email content, and preview emails during development.

## Official companion libraries<a href="#official-companion-libraries" class="hash-link" aria-label="Direct link to Official companion libraries" translate="no" title="Direct link to Official companion libraries">​</a>

These packages are maintained by the Nodemailer team and designed to work seamlessly with Nodemailer.

1.  [smtp-server](/extras/smtp-server) - Build your own SMTP server to accept incoming email connections. Useful for creating custom mail servers, testing email workflows, or building email-receiving applications.
2.  [smtp-connection](/extras/smtp-connection) - A low-level SMTP client for establishing connections to mail servers. This is the underlying component that powers Nodemailer's [SMTP transport](/smtp), exposed separately for advanced use cases where you need direct control over the SMTP protocol.
3.  [mailparser](/extras/mailparser) - Parse raw email messages (RFC 822 format) into structured JavaScript objects. The streaming parser efficiently handles large emails and extracts headers, body content, and attachments into an easy-to-use format.
4.  [mailcomposer](/extras/mailcomposer) - Generate RFC 822-compliant email messages from JavaScript objects. This is useful when you need to create a properly formatted [MIME message](/message) without sending it immediately, such as for storing drafts or passing to another system.

## Related projects<a href="#related-projects" class="hash-link" aria-label="Direct link to Related projects" translate="no" title="Direct link to Related projects">​</a>

These are independent open-source projects that complement Nodemailer and may be helpful depending on your use case.

5.  <a href="https://emailengine.app/?utm_source=nodemailer&amp;utm_campaign=nodemailer&amp;utm_medium=module-link" target="_blank" rel="noopener noreferrer">EmailEngine</a> - A self-hosted application that provides a REST API for any IMAP mailbox. It handles email sending via SMTP and delivers real-time updates through webhooks, making it easier to integrate email functionality into your applications.
6.  <a href="https://imapflow.com/" target="_blank" rel="noopener noreferrer">ImapFlow</a> - A modern, Promise-based IMAP client for Node.js. Originally built for EmailEngine, it works as a standalone library for reading and managing emails from any IMAP server.
7.  <a href="https://github.com/andris9/mailauth" target="_blank" rel="noopener noreferrer">mailauth</a> - A comprehensive library for email authentication. It validates and generates SPF, DKIM, DMARC, ARC, and BIMI records, helping you verify email authenticity and improve deliverability.
8.  <a href="https://github.com/forwardemail/email-templates" target="_blank" rel="noopener noreferrer">email-templates</a> - A complete framework for managing email templates. It supports template rendering, preview in browsers and iOS Simulator, and integrates directly with Nodemailer for sending.
9.  <a href="https://github.com/forwardemail/preview-email" target="_blank" rel="noopener noreferrer">preview-email</a> - A development tool that automatically opens emails in your browser for preview. It works with Nodemailer to help you inspect and debug email content before sending to real recipients.

------------------------------------------------------------------------

<div class="theme-admonition theme-admonition-note admonition_xJq3 alert alert--secondary">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTQgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTYuMyA1LjY5YS45NDIuOTQyIDAgMCAxLS4yOC0uN2MwLS4yOC4wOS0uNTIuMjgtLjcuMTktLjE4LjQyLS4yOC43LS4yOC4yOCAwIC41Mi4wOS43LjI4LjE4LjE5LjI4LjQyLjI4LjcgMCAuMjgtLjA5LjUyLS4yOC43YTEgMSAwIDAgMS0uNy4zYy0uMjggMC0uNTItLjExLS43LS4zek04IDcuOTljLS4wMi0uMjUtLjExLS40OC0uMzEtLjY5LS4yLS4xOS0uNDItLjMtLjY5LS4zMUg2Yy0uMjcuMDItLjQ4LjEzLS42OS4zMS0uMi4yLS4zLjQ0LS4zMS42OWgxdjNjLjAyLjI3LjExLjUuMzEuNjkuMi4yLjQyLjMxLjY5LjMxaDFjLjI3IDAgLjQ4LS4xMS42OS0uMzEuMi0uMTkuMy0uNDIuMzEtLjY5SDhWNy45OHYuMDF6TTcgMi4zYy0zLjE0IDAtNS43IDIuNTQtNS43IDUuNjggMCAzLjE0IDIuNTYgNS43IDUuNyA1LjdzNS43LTIuNTUgNS43LTUuN2MwLTMuMTUtMi41Ni01LjY5LTUuNy01LjY5di4wMXpNNyAuOThjMy44NiAwIDcgMy4xNCA3IDdzLTMuMTQgNy03IDctNy0zLjEyLTctNyAzLjE0LTcgNy03eiIgLz48L3N2Zz4=)</span>note

</div>

<div class="admonitionContent_BuS1">

The first four packages (smtp-server, smtp-connection, mailparser, and mailcomposer) are maintained within the Nodemailer GitHub organization and follow the same release cycle as Nodemailer. The remaining projects are maintained by the broader open-source community.

</div>

</div>

</div>

<a href="/plugins/create" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

Create plugins

</div>

<a href="/extras/smtp-server" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

SMTP Server

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#official-companion-libraries" class="table-of-contents__link toc-highlight">Official companion libraries</a>
- <a href="#related-projects" class="table-of-contents__link toc-highlight">Related projects</a>

</div>

</div>

</div>

</div>

</div>
