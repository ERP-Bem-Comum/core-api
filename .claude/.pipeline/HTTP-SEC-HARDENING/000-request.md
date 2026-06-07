# HTTP-SEC-HARDENING — Hardening da borda HTTP (F3/F4/F5)

**Size:** M · **Origem:** auditoria `security-backend-expert` no QA E2E da spec 005 (2026-06-07) · **Branch:** `005-gestao-usuarios`

> Findings transversais a TODA a borda HTTP (`shared/http` + rotas de escrita de users). Defesa em
> profundidade; nenhum é exploit ativo hoje, mas fecham vetores conhecidos.

## Escopo

- **F3 (Médio) — `sendResult` vaza componente interno em 5xx.** Hoje o envelope de erro espelha o
  error-code interno (ex.: `invite-mail-failed`, `user-query-unavailable`) como `code` e `message`,
  mesmo em 5xx. Para `status >= 500`: usar `code: 'internal'` + `message: 'An internal error occurred'`
  (alinha com o handler central em `errors.ts:80`) e logar o code real no servidor. 4xx permanece
  informativo (são erros do cliente).
- **F4 (Baixo) — `x-request-id` do cliente sem validação.** `genReqId` aceita qualquer string como
  `req.id`, propagada a logs e ao envelope. Validar formato (`[A-Za-z0-9_-]`, ≤128); senão gerar UUID.
- **F5 (Baixo) — rotas de escrita de users sem rate-limit dedicado.** POST/PUT/PATCH compartilham só
  o teto global (200/min). Aplicar `config.rateLimit` moderado (30/min) por rota.

## Arquivos

| Ação | Arquivo |
|---|---|
| Modificar | `src/shared/http/reply.ts` — F3 |
| Modificar | `src/shared/http/app.ts` — F4 (`genReqId`) |
| Modificar | `src/modules/auth/adapters/http/users-plugin.ts` — F5 |
| Criar (teste) | `tests/shared/http/sec-hardening.test.ts` — F3 + F4 |
| Criar (teste) | `tests/modules/auth/adapters/http/users-write-rate-limit.test.ts` — F5 |

## Critérios de aceite (W0 — RED)

- **CA1 (F3)**: erro mapeado a 503 → envelope `code:'internal'`, `message:'An internal error occurred'`; body NÃO contém o code interno.
- **CA2 (F3)**: erro mapeado a 422 → envelope preserva o code interno (informativo ao cliente).
- **CA3 (F4)**: `x-request-id` > 128 chars ou com chars inválidos → não refletido (envelope usa UUID gerado).
- **CA4 (F4)**: `x-request-id` válido curto → refletido no envelope (preserva rastreabilidade legítima).
- **CA5 (F5)**: exceder o limite de escrita em `POST /api/v1/users` → 429 (Too Many Requests).
