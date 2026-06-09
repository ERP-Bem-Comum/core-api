# W2 — REVIEW (Round 1)

Ticket: CTR-EMAIL-ADAPTER-RESEND · Modo: read-only

## Veredito: APPROVED

## Checklist de regras

| Regra | Fonte | Resultado |
| --- | --- | --- |
| `try/catch` só no adapter, convertido para `Result` na borda | `.claude/rules/adapters.md` | ✅ `send` envolve tudo; `catch` → `err(transport-failed)` |
| Nunca vaza `Error`/exception para application/domain | `.claude/rules/adapters.md` | ✅ todas as saídas são `Result` |
| `import type` para tipos puros (`verbatimModuleSyntax`) | AGENTS.md | ✅ linhas 25-27; `import { type Result, ok, err }` mixed correto |
| Extensão `.ts` em import relativo; bare specifier sem `.ts` | AGENTS.md | ✅ `resend` é lib; relativos têm `.ts` |
| ASCII puro nos sources | regra do módulo | ✅ `grep -P "[^\x00-\x7F]"` vazio |
| Domínio/application intocados | `.claude/rules/domain.md` | ✅ só adapters + public-api + package.json |
| Erros como tagged/kebab EN | AGENTS.md | ✅ reusa `EmailError` (`invalid-recipient`/`smtp-rejected`/`transport-failed`) |
| Paridade estrutural com Nodemailer | ticket | ✅ config separado + adapter + map de erro + público |
| ADR-0006 (import só via public-api entre módulos) | ADR | ✅ adapter exposto via `public-api`; consumers não tocam `adapters/` |

## Pontos de borda corretos

- **Não desestrutura `{ data, error }`** — preserva o narrowing do `Response<T>` do SDK. `result.error !== null` discrimina; `result.data.id` acessível sem non-null assertion. Correto e não-óbvio (documentado no header).
- **Spread condicional** para `cc`/`bcc`/`html` respeita `exactOptionalPropertyTypes`.
- `mapResendError` exportada e pura → testável sem `mock.module`.

## Observações não-bloqueantes (sem ação neste ticket)

1. **Heurística de `mapResendError`** (`/\b(to|recipient)\b/` + `!from`) é frágil por natureza — os nomes de erro do Resend não distinguem recipient de forma canônica. Mitigado: documentado (risco #1 do request), coberto por 3 testes unitários e validável no integration opt-in. Aceito para v1.
2. **`new Date().toISOString()` inline** — mesma escolha do adapter Nodemailer (`nodemailer.ts:77`); não injeta `Clock`. Paridade mantida; injeção de relógio seria refactor cross-adapter, fora de escopo.

Nenhum issue exige mudança. Segue para W3.
