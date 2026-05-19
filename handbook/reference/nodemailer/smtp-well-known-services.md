<div class="docMainContainer_TBSr" role="main">

<div class="container padding-top--md padding-bottom--lg">

<div class="row">

<div class="col docItemCol_VOVn">

<div class="docItemContainer_Djhp">

- <a href="/" class="breadcrumbs__link" aria-label="Home page"><img src="data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMjQgMjQiIGNsYXNzPSJicmVhZGNydW1iSG9tZUljb25fWU5GVCI+PHBhdGggZD0iTTEwIDE5di01aDR2NWMwIC41NS40NSAxIDEgMWgzYy41NSAwIDEtLjQ1IDEtMXYtN2gxLjdjLjQ2IDAgLjY4LS41Ny4zMy0uODdMMTIuNjcgMy42Yy0uMzgtLjM0LS45Ni0uMzQtMS4zNCAwbC04LjM2IDcuNTNjLS4zNC4zLS4xMy44Ny4zMy44N0g1djdjMCAuNTUuNDUgMSAxIDFoM2MuNTUgMCAxLS40NSAxLTF6IiBmaWxsPSJjdXJyZW50Q29sb3IiIC8+PC9zdmc+" class="breadcrumbHomeIcon_YNFT" /></a>
- <a href="/smtp" class="breadcrumbs__link"><span>SMTP transport</span></a>
- <span class="breadcrumbs__link">Well-Known Services</span>

<div class="tocCollapsible_ETCw theme-doc-toc-mobile tocMobile_ITEo">

On this page

</div>

<div class="theme-doc-markdown markdown">

<div>

# Well-Known Services

</div>

Nodemailer includes built-in connection presets for many popular email providers. Instead of manually looking up each provider's SMTP server hostname, port number, and security settings, you can simply specify a **`service`** name when creating a transport. Nodemailer automatically configures all the connection details for you.

<div class="language-js codeBlockContainer_Ckt0 theme-code-block" style="--prism-color:#393A34;--prism-background-color:#f6f8fa">

<div class="codeBlockContent_QJqH">

``` js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail", // Use any Service ID from the table below (case-insensitive)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});
```

</div>

</div>

The `service` option is simply a convenient shortcut. You can always specify `host`, `port`, `secure`, and other connection options manually if you prefer. If your provider is not listed or if connection settings have changed, you have two options: submit a pull request to update the <a href="https://github.com/nodemailer/nodemailer/blob/master/lib/well-known/services.json" target="_blank" rel="noopener noreferrer">services.json</a> file, or bypass the presets entirely and configure the connection details yourself.

<div class="theme-admonition theme-admonition-info admonition_xJq3 alert alert--info">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTQgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTcgMi4zYzMuMTQgMCA1LjcgMi41NiA1LjcgNS43cy0yLjU2IDUuNy01LjcgNS43QTUuNzEgNS43MSAwIDAgMSAxLjMgOGMwLTMuMTQgMi41Ni01LjcgNS43LTUuN3pNNyAxQzMuMTQgMSAwIDQuMTQgMCA4czMuMTQgNyA3IDcgNy0zLjE0IDctNy0zLjE0LTctNy03em0xIDNINnY1aDJWNHptMCA2SDZ2Mmgydi0yeiIgLz48L3N2Zz4=)</span>info

</div>

<div class="admonitionContent_BuS1">

Most major email providers now require [OAuth 2.0 authentication](/smtp/oauth2) or app-specific passwords for security. The service presets only configure the server connection settings. You are still responsible for setting up the correct authentication method for your provider. For Gmail-specific setup instructions, see [Using Gmail](/guides/using-gmail).

</div>

</div>

<div class="theme-admonition theme-admonition-tip admonition_xJq3 alert alert--success">

<div class="admonitionHeading_Gvgb">

<span class="admonitionIcon_Rf37">![](data:image/svg+xml;base64,PHN2ZyB2aWV3Ym94PSIwIDAgMTIgMTYiPjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTYuNSAwQzMuNDggMCAxIDIuMTkgMSA1YzAgLjkyLjU1IDIuMjUgMSAzIDEuMzQgMi4yNSAxLjc4IDIuNzggMiA0djFoNXYtMWMuMjItMS4yMi42Ni0xLjc1IDItNCAuNDUtLjc1IDEtMi4wOCAxLTMgMC0yLjgxLTIuNDgtNS01LjUtNXptMy42NCA3LjQ4Yy0uMjUuNDQtLjQ3LjgtLjY3IDEuMTEtLjg2IDEuNDEtMS4yNSAyLjA2LTEuNDUgMy4yMy0uMDIuMDUtLjAyLjExLS4wMi4xN0g1YzAtLjA2IDAtLjEzLS4wMi0uMTctLjItMS4xNy0uNTktMS44My0xLjQ1LTMuMjMtLjItLjMxLS40Mi0uNjctLjY3LTEuMTFDMi40NCA2Ljc4IDIgNS42NSAyIDVjMC0yLjIgMi4wMi00IDQuNS00IDEuMjIgMCAyLjM2LjQyIDMuMjIgMS4xOUMxMC41NSAyLjk0IDExIDMuOTQgMTEgNWMwIC42Ni0uNDQgMS43OC0uODYgMi40OHpNNCAxNGg1Yy0uMjMgMS4xNC0xLjMgMi0yLjUgMnMtMi4yNy0uODYtMi41LTJ6IiAvPjwvc3ZnPg==)</span>AWS SES Users

</div>

<div class="admonitionContent_BuS1">

While the SES service presets below use SMTP credentials, Nodemailer also offers a dedicated [SES transport](/transports/ses) that integrates directly with the AWS SDK. The SES transport can be simpler to configure if you are already using AWS credentials in your application.

</div>

</div>

## List of built-in services<a href="#list-of-built-in-services" class="hash-link" aria-label="Direct link to List of built-in services" translate="no" title="Direct link to List of built-in services">​</a>

| Service ID | Provider | SMTP host | Port |
|----|----|----|----|
| 1und1 | 1&1 IONOS | smtp.1und1.de | 465 |
| 126 | 126 Mail | smtp.126.com | 465 |
| 163 | 163 Mail | smtp.163.com | 465 |
| Aliyun | Alibaba Cloud (Aliyun) | smtp.aliyun.com | 465 |
| AliyunQiye | Alibaba Cloud Enterprise | smtp.qiye.aliyun.com | 465 |
| AOL | AOL Mail | smtp.aol.com | 587 |
| Aruba | Aruba PEC (Italian) | smtps.aruba.it | 465 |
| Bluewin | Swisscom Bluewin | smtpauths.bluewin.ch | 465 |
| BOL | BOL Mail (Brazilian) | smtp.bol.com.br | 587 |
| DebugMail | DebugMail.io | debugmail.io | 25 |
| Disroot | Disroot (privacy-focused) | disroot.org | 587 |
| DynectEmail | Oracle Dynect Email | smtp.dynect.net | 25 |
| ElasticEmail | Elastic Email | smtp.elasticemail.com | 465 |
| Ethereal | Ethereal Email (test) | smtp.ethereal.email | 587 |
| FastMail | FastMail | smtp.fastmail.com | 465 |
| Feishu Mail | Feishu Mail | smtp.feishu.cn | 465 |
| Forward Email | Forward Email | smtp.forwardemail.net | 465 |
| GandiMail | Gandi Mail | mail.gandi.net | 587 |
| Gmail | Gmail / Google Workspace | smtp.gmail.com | 465 |
| GmailWorkspace | Gmail Workspace (SMTP relay) | smtp-relay.gmail.com | 465 |
| GMX | GMX Mail | mail.gmx.com | 587 |
| Godaddy | GoDaddy (US) | smtpout.secureserver.net | 25 |
| GodaddyAsia | GoDaddy (Asia) | smtp.asia.secureserver.net | 25 |
| GodaddyEurope | GoDaddy (Europe) | smtp.europe.secureserver.net | 25 |
| hot.ee | Hot.ee | mail.hot.ee | 25 |
| Hotmail | Microsoft Outlook / Hotmail | smtp-mail.outlook.com | 587 |
| iCloud | Apple iCloud Mail | smtp.mail.me.com | 587 |
| Infomaniak | Infomaniak Mail | mail.infomaniak.com | 587 |
| KolabNow | KolabNow (secure email) | smtp.kolabnow.com | 465 |
| Loopia | Loopia | mailcluster.loopia.se | 465 |
| Loops | Loops | smtp.loops.so | 587 |
| mail.ee | Mail.ee | smtp.mail.ee | 25 |
| Mail.ru | Mail.ru | smtp.mail.ru | 465 |
| Mailcatch.app | Mailcatch.app (sandbox) | sandbox-smtp.mailcatch.app | 2525 |
| Maildev | Maildev (local) | localhost | 1025 |
| MailerSend | MailerSend | smtp.mailersend.net | 587 |
| Mailgun | Mailgun | smtp.mailgun.org | 465 |
| Mailjet | Mailjet | in.mailjet.com | 587 |
| Mailosaur | Mailosaur | mailosaur.io | 25 |
| Mailtrap | Mailtrap | live.smtp.mailtrap.io | 587 |
| Mandrill | Mandrill | smtp.mandrillapp.com | 587 |
| Naver | Naver | smtp.naver.com | 587 |
| OhMySMTP | OhMySMTP | smtp.ohmysmtp.com | 587 |
| One | one.com | send.one.com | 465 |
| OpenMailBox | OpenMailBox | smtp.openmailbox.org | 465 |
| Outlook365 | Microsoft 365 / Outlook 365 | smtp.office365.com | 587 |
| Postmark | Postmark | smtp.postmarkapp.com | 2525 |
| Proton | Proton Mail | smtp.protonmail.ch | 587 |
| qiye.aliyun | Aliyun Enterprise (mxhichina) | smtp.mxhichina.com | 465 |
| QQ | QQ Mail | smtp.qq.com | 465 |
| QQex | QQ Enterprise Mail | smtp.exmail.qq.com | 465 |
| Resend | Resend | smtp.resend.com | 465 |
| Runbox | Runbox (Norwegian) | smtp.runbox.com | 465 |
| SendCloud | SendCloud | smtp.sendcloud.net | 2525 |
| SendGrid | SendGrid | smtp.sendgrid.net | 587 |
| SendinBlue | Brevo (formerly Sendinblue) | smtp-relay.brevo.com | 587 |
| SendPulse | SendPulse | smtp-pulse.com | 465 |
| SES | AWS SES (generic) | email-smtp.us-east-1.amazonaws.com | 465 |
| SES-US-EAST-1 | AWS SES US East (N. Virginia) | email-smtp.us-east-1.amazonaws.com | 465 |
| SES-US-EAST-2 | AWS SES US East (Ohio) | email-smtp.us-east-2.amazonaws.com | 465 |
| SES-US-WEST-1 | AWS SES US West (N. California) | email-smtp.us-west-1.amazonaws.com | 465 |
| SES-US-WEST-2 | AWS SES US West (Oregon) | email-smtp.us-west-2.amazonaws.com | 465 |
| SES-EU-WEST-1 | AWS SES EU West (Ireland) | email-smtp.eu-west-1.amazonaws.com | 465 |
| SES-EU-WEST-2 | AWS SES EU West (London) | email-smtp.eu-west-2.amazonaws.com | 465 |
| SES-EU-WEST-3 | AWS SES EU West (Paris) | email-smtp.eu-west-3.amazonaws.com | 465 |
| SES-EU-CENTRAL-1 | AWS SES EU Central (Frankfurt) | email-smtp.eu-central-1.amazonaws.com | 465 |
| SES-EU-NORTH-1 | AWS SES EU North (Stockholm) | email-smtp.eu-north-1.amazonaws.com | 465 |
| SES-AP-SOUTH-1 | AWS SES Asia Pacific (Mumbai) | email-smtp.ap-south-1.amazonaws.com | 465 |
| SES-AP-NORTHEAST-1 | AWS SES Asia Pacific (Tokyo) | email-smtp.ap-northeast-1.amazonaws.com | 465 |
| SES-AP-NORTHEAST-2 | AWS SES Asia Pacific (Seoul) | email-smtp.ap-northeast-2.amazonaws.com | 465 |
| SES-AP-NORTHEAST-3 | AWS SES Asia Pacific (Osaka) | email-smtp.ap-northeast-3.amazonaws.com | 465 |
| SES-AP-SOUTHEAST-1 | AWS SES Asia Pacific (Singapore) | email-smtp.ap-southeast-1.amazonaws.com | 465 |
| SES-AP-SOUTHEAST-2 | AWS SES Asia Pacific (Sydney) | email-smtp.ap-southeast-2.amazonaws.com | 465 |
| SES-CA-CENTRAL-1 | AWS SES Canada (Central) | email-smtp.ca-central-1.amazonaws.com | 465 |
| SES-SA-EAST-1 | AWS SES South America (Sao Paulo) | email-smtp.sa-east-1.amazonaws.com | 465 |
| SES-US-GOV-EAST-1 | AWS SES GovCloud (US-East) | email-smtp.us-gov-east-1.amazonaws.com | 465 |
| SES-US-GOV-WEST-1 | AWS SES GovCloud (US-West) | email-smtp.us-gov-west-1.amazonaws.com | 465 |
| Seznam | Seznam.cz Email | smtp.seznam.cz | 465 |
| SMTP2GO | SMTP2GO | mail.smtp2go.com | 2525 |
| Sparkpost | SparkPost | smtp.sparkpostmail.com | 587 |
| Tipimail | Tipimail | smtp.tipimail.com | 587 |
| Tutanota | Tutanota | smtp.tutanota.com | 465 |
| Yahoo | Yahoo Mail | smtp.mail.yahoo.com | 465 |
| Yandex | Yandex Mail | smtp.yandex.ru | 465 |
| Zimbra | Zimbra Mail Server | smtp.zimbra.com | 587 |
| Zoho | Zoho Mail | smtp.zoho.com | 465 |

</div>

<a href="/smtp" class="pagination-nav__link pagination-nav__link--prev"></a>

<div class="pagination-nav__sublabel">

Previous

</div>

<div class="pagination-nav__label">

SMTP transport

</div>

<a href="/smtp/oauth2" class="pagination-nav__link pagination-nav__link--next"></a>

<div class="pagination-nav__sublabel">

Next

</div>

<div class="pagination-nav__label">

OAuth2

</div>

</div>

</div>

<div class="col col--3">

<div class="tableOfContents_bqdL thin-scrollbar theme-doc-toc-desktop">

- <a href="#list-of-built-in-services" class="table-of-contents__link toc-highlight">List of built-in services</a>

</div>

</div>

</div>

</div>

</div>
