# W1 — REPORT (GREEN)

Ticket: CTR-EMAIL-ADAPTER-RESEND

## Implementado

| Arquivo | Conteúdo |
| --- | --- |
| `src/modules/notifications/adapters/email/resend-config.ts` | `ResendConfig`, `ResendConfigError`, `parseResendConfig` (puro, `RESEND_API_KEY`) |
| `src/modules/notifications/adapters/email/resend.ts` | `createResendEmailSender(config): EmailSender` + `mapResendError` (puro) |
| `src/modules/notifications/public-api/index.ts` | exports do Resend ao lado do Nodemailer (sem remover nada) |
| `package.json` / lockfile | `resend@6.12.4` via `pnpm add` (dependency de produção) |

## Decisões de borda (vs Nodemailer)

- `resend.emails.send()` **não lança** em erro de API → retorna `Response<T>` (discriminated union por `error`). O adapter **não desestrutura** `{ data, error }` (quebraria o narrowing) — acessa `result.error` / `result.data`.
- Mapeamento em duas frentes convergindo no `EmailError` existente:
  - `result.error !== null` → `mapResendError` (`ErrorResponse { message, name: RESEND_ERROR_CODE_KEY, statusCode }`).
  - `catch` → `transport-failed`.
- `mapResendError`: `name` ∈ {`validation_error`, `invalid_parameter`, `missing_required_field`} + mensagem citando `to`/`recipient` (e não `from`) → `invalid-recipient`; qualquer outra rejeição estruturada → `smtp-rejected` (bucket "provider rejeitou").
- Payload com spread condicional para `cc`/`bcc`/`html` (`exactOptionalPropertyTypes`). `text` sempre presente satisfaz `RequireAtLeastOne<EmailRenderOptions>` do SDK.

## Verificação local

```
# unit (pnpm test):
ℹ tests 6 · pass 6 · fail 0   (parseResendConfig 3 + mapResendError 3)

# integration default (sem env):
ℹ skipped 1   (skip correto)

# typecheck:
tsc --noEmit  -> sem erros
```

CAs CA1..CA7, CA9..CA11 atendidos em código. CA8 (gates completos) é W3. CA-T5 (send real) validável só com `RESEND_API_KEY` provisionada.
