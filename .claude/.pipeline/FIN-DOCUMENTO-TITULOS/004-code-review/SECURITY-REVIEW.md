# Security Review — borda HTTP `/api/v2/financial` — FIN-DOCUMENTO-TITULOS

**Reviewer:** agente `security-backend-expert` · **Data:** 2026-06-15 · **Veredito original:** CHANGES-REQUESTED → **resolvido**

## Executive summary

Postura de segurança **sólida** para fatia 1. Herda o hardening global de `src/shared/http/app.ts` (`helmet`, `cors`
allowlist, `rate-limit`, `bodyLimit`, Pino `redact`, `cache-control: no-store`, Swagger UI guardado por `NODE_ENV`),
aplicado automaticamente a todo plugin registrado. RBAC em todas as 7 rotas, com separação funcional. Persistência
Drizzle 100% parametrizada (sem concat de SQL). Error handler central não vaza stack trace.

**0 Blockers · 1 Major · 3 Minors.**

## Findings e resolução

| # | Sev | Arquivo | Problema | Status |
| --- | --- | --- | --- | --- |
| **F1** | 🟠 Major | `adapters/http/schemas.ts:16` | `centsStringSchema` sem `.max()` → `Number("9".repeat(30))` = `1e30` (float) passa o regex `^\d+$`; amplificação numérica / valor monetário corrompido. | ✅ **CORRIGIDO** — `.max(16)` + `.refine(Number.isSafeInteger)` na borda (ADR-0027). Teste CA16 cobre (→ 400). |
| **F2** | 🔵 Minor | `adapters/http/plugin.ts:88` | `sendDomainError` reflete o code de domínio no campo `message`; 5xx (`document-repository-failure`/`outbox-append-failed`) expunha o componente interno. | ✅ **CORRIGIDO** — distinção `status >= 500` → envelope genérico `'An internal error occurred'` + log por `requestId`, espelhando `shared/http/reply.ts:38-44`. |
| **F3** | 🔵 Minor | `plugin.ts:278` + `approve-document.ts:19` | `version` exigido por `approveBodySchema` é descartado no handler; optimistic lock do cliente não enforçado (repo serializa via `SELECT FOR UPDATE`, mas versão stale do cliente não é detectada). | ⏭️ **Follow-up** — decisão de produto (enforçar vs remover do contrato). Ver REVIEW Issue 1. Não-blocker: repo serializa escrita. |
| **F4** | 🔵 Minor | `composition.ts:54` | `listDocuments` = `findById` placeholder; `GET /documents` é stub que devolve lista vazia (Fatia 1). | ⏭️ **Follow-up** — stub documentado; filtros aplicados na Fatia 2. Ver REVIEW Issue 3. |

## Paridade com `contracts/adapters/http/` (referência madura)

requireAuth, authorize, Zod em body/params/query, `z.uuid()` em params, error handler sem stack trace, helmet/cors/
rate-limit, Swagger guardado em prod, `cache-control: no-store` → **paridade total** (tudo herdado de `app.ts`).
Os únicos deltas eram F1 (bounds de valor) e F2 (distinção 5xx no helper) — **ambos corrigidos**, deixando a borda
financial no mesmo nível de hardening da de contracts.

## Falsos-positivos contextualizados (não-findings)

- Sem TLS no core-api → TLS termina no BFF (ADR-0005/0025).
- `as unknown as string` em `DocumentId` → branded type, `:id` validado por `z.uuid()` antes do cast; não é injection.
- `process.stderr.write` no repo → erro de infra vai p/ stderr sem cruzar a borda (adapters.md); só loga `String(cause)`.
- `req.userId` → populado por `makeRequireAuth` só após `verifyAccessToken` ok (claim `sub` do JWT verificado); sem spoof via header.
- `throw` dentro de `db.transaction()` → mecanismo padrão de rollback do Drizzle; capturado e convertido em `Result`.

## Veredito final

**APPROVED** após correção de F1 (Major) e F2 (Minor). F3/F4 encaminhados como follow-up (decisões de produto/stub,
não-bloqueantes). Gate W3 reverificado verde após os fixes (typecheck + format + lint + 2439 test + CA16 + 4 integração).
