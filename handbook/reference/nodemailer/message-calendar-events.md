<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <a href="/message" class="breadcrumbs__link"><span>Message configuration</span></a>
- <span class="breadcrumbs__link">Calendar events</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# Calendar events

</div>

Nodemailer can embed an iCalendar (`.ics`) file directly in an email. When recipients open the message in calendar-aware email clients such as Gmail, Outlook, or Apple Mail, they will see interactive controls like **Add to calendar** or **Accept / Decline** buttons.

<div class="theme-admonition theme-admonition-info admonition_xJq3 alert alert--info">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTQgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTcgMi4zYzMuMTQgMCA1LjcgMi41NiA1LjcgNS43cy0yLjU2IDUuNy01LjcgNS43QTUuNzEgNS43MSAwIDAgMSAxLjMgOGMwLTMuMTQgMi41Ni01LjcgNS43LTUuN3pNNyAxQzMuMTQgMSAwIDQuMTQgMCA4czMuMTQgNyA3IDcgNy0zLjE0IDctNy0zLjE0LTctNy03em0xIDNINnY1aDJWNHptMCA2SDZ2Mmgydi0yeiIgLz48L3N2Zz4=)</span>info

</div>

<div class="admonitionContent_BuS1">

Nodemailer handles attaching the calendar file to your email, but it does **not** generate the iCalendar content itself. You need to create valid `.ics` data using a library like **<a href="https://www.npmjs.com/package/ical-generator" target="_blank" rel="noopener noreferrer">ical-generator</a>** or **<a href="https://www.npmjs.com/package/ics" target="_blank" rel="noopener noreferrer">ics</a>**, then pass that output to Nodemailer.

</div>

</div>

## `icalEvent` message option<a href="#icalevent-message-option" class="hash-link" aria-label="Direct link to icalevent-message-option" translate="no" title="Direct link to icalevent-message-option">​</a>

To attach a calendar event, add an `icalEvent` object to your message when calling `transporter.sendMail()`:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
let message = {
  /* ...from, to, subject, etc. */
  icalEvent: {
    /* options */
  },
};
```

</div>

</div>

| Property | Type | Default | Description |
|----|----|----|----|
| `method` | `string` | `'PUBLISH'` | The iCalendar <a href="https://www.rfc-editor.org/rfc/rfc5546#section-1.4" target="_blank" rel="noopener noreferrer"><strong>METHOD</strong></a> property. This is case-insensitive. Common values are `'REQUEST'` (for meeting invitations), `'REPLY'` (for responses), and `'CANCEL'` (for cancellations). |
| `filename` | `string` | `'invite.ics'` | The filename displayed in the email client for the attached calendar file. |
| `content` | `string | Buffer | Stream` | \- | The raw iCalendar data as a string, Buffer, or readable Stream. |
| `path` | `string` | \- | An absolute or relative file path to a local `.ics` file on disk. |
| `href` | `string` | \- | A URL (HTTP or HTTPS) from which Nodemailer will fetch the calendar data. |
| `encoding` | `string` | \- | The encoding of the `content` string, if applicable (for example, `'base64'` or `'hex'`). |

You must provide **exactly one** of `content`, `path`, or `href` to specify the calendar data source.

<div class="theme-admonition theme-admonition-note admonition_xJq3 alert alert--secondary">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTQgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTYuMyA1LjY5YS45NDIuOTQyIDAgMCAxLS4yOC0uN2MwLS4yOC4wOS0uNTIuMjgtLjcuMTktLjE4LjQyLS4yOC43LS4yOC4yOCAwIC41Mi4wOS43LjI4LjE4LjE5LjI4LjQyLjI4LjcgMCAuMjgtLjA5LjUyLS4yOC43YTEgMSAwIDAgMS0uNy4zYy0uMjggMC0uNTItLjExLS43LS4zek04IDcuOTljLS4wMi0uMjUtLjExLS40OC0uMzEtLjY5LS4yLS4xOS0uNDItLjMtLjY5LS4zMUg2Yy0uMjcuMDItLjQ4LjEzLS42OS4zMS0uMi4yLS4zLjQ0LS4zMS42OWgxdjNjLjAyLjI3LjExLjUuMzEuNjkuMi4yLjQyLjMxLjY5LjMxaDFjLjI3IDAgLjQ4LS4xMS42OS0uMzEuMi0uMTkuMy0uNDIuMzEtLjY5SDhWNy45OHYuMDF6TTcgMi4zYy0zLjE0IDAtNS43IDIuNTQtNS43IDUuNjggMCAzLjE0IDIuNTYgNS43IDUuNyA1LjdzNS43LTIuNTUgNS43LTUuN2MwLTMuMTUtMi41Ni01LjY5LTUuNy01LjY5di4wMXpNNyAuOThjMy44NiAwIDcgMy4xNCA3IDdzLTMuMTQgNy03IDctNy0zLjEyLTctNyAzLjE0LTcgNy03eiIgLz48L3N2Zz4=)</span>Best practice

</div>

<div class="admonitionContent_BuS1">

Calendar invitations can be sensitive to email structure. Adding extra file [attachments](/message/attachments) or complex alternative message bodies often causes email clients to display the calendar incorrectly or not at all. For the best compatibility across different email clients, keep your message simple: include only **text**, **html**, and a single **icalEvent**. Avoid adding other attachments to calendar invitation emails.

</div>

</div>

## Examples<a href="#examples" class="hash-link" aria-label="Direct link to Examples" translate="no" title="Direct link to Examples">​</a>

### 1. Send a meeting invitation (REQUEST) from a string<a href="#1-send-a-meeting-invitation-request-from-a-string" class="hash-link" aria-label="Direct link to 1. Send a meeting invitation (REQUEST) from a string" translate="no" title="Direct link to 1. Send a meeting invitation (REQUEST) from a string">​</a>

Use `method: 'REQUEST'` when you want recipients to accept or decline an invitation:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
const appointment = `BEGIN:VCALENDAR\r
PRODID:-//ACME/DesktopCalendar//EN\r
VERSION:2.0\r
METHOD:REQUEST\r
BEGIN:VEVENT\r
DTSTART:20240115T100000Z\r
DTEND:20240115T110000Z\r
SUMMARY:Team Meeting\r
UID:unique-event-id@example.com\r
END:VEVENT\r
END:VCALENDAR`;

let message = {
  from: "sender@example.com",
  to: "recipient@example.com",
  subject: "Appointment",
  text: "Please see the attached appointment",
  icalEvent: {
    filename: "invitation.ics",
    method: "REQUEST",
    content: appointment,
  },
};
```

</div>

</div>

### 2. Send a calendar event (PUBLISH) from a file<a href="#2-send-a-calendar-event-publish-from-a-file" class="hash-link" aria-label="Direct link to 2. Send a calendar event (PUBLISH) from a file" translate="no" title="Direct link to 2. Send a calendar event (PUBLISH) from a file">​</a>

Use `method: 'PUBLISH'` when you want to share an event without requiring a response:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
let message = {
  from: "sender@example.com",
  to: "recipient@example.com",
  subject: "Appointment",
  text: "Please see the attached appointment",
  icalEvent: {
    method: "PUBLISH",
    path: "/absolute/path/to/invite.ics",
  },
};
```

</div>

</div>

### 3. Send a cancellation (CANCEL) from a URL<a href="#3-send-a-cancellation-cancel-from-a-url" class="hash-link" aria-label="Direct link to 3. Send a cancellation (CANCEL) from a URL" translate="no" title="Direct link to 3. Send a cancellation (CANCEL) from a URL">​</a>

Use `method: 'CANCEL'` to notify recipients that a previously scheduled event has been cancelled:

<div class="language-javascript codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` javascript
let message = {
  from: "sender@example.com",
  to: "recipient@example.com",
  subject: "Appointment cancelled",
  text: "The appointment has been cancelled. See details in the attached calendar update.",
  icalEvent: {
    method: "CANCEL",
    href: "https://www.example.com/events/123/cancel.ics",
  },
};
```

</div>

</div>

------------------------------------------------------------------------

For a complete working example, combine the `message` object above with [`nodemailer.createTransport()`](/) and call `transporter.sendMail()`.

</div>

<a href="/message/embedded-images" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

Embedded images

</div>

<a href="/message/alternatives" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

Alternatives

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#icalevent-message-option" class="table-of-contents__link toc-highlight"><code>icalEvent</code> message option</a>
- <a href="#examples" class="table-of-contents__link toc-highlight">Examples</a>
  - <a href="#1-send-a-meeting-invitation-request-from-a-string" class="table-of-contents__link toc-highlight">1. Send a meeting invitation (REQUEST) from a string</a>
  - <a href="#2-send-a-calendar-event-publish-from-a-file" class="table-of-contents__link toc-highlight">2. Send a calendar event (PUBLISH) from a file</a>
  - <a href="#3-send-a-cancellation-cancel-from-a-url" class="table-of-contents__link toc-highlight">3. Send a cancellation (CANCEL) from a URL</a>

</div>

</div>

</div>

</div>

</div>
