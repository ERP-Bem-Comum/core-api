# W3 — Gate de Qualidade · BGP-ETL-WRITE-PORT (fatia 2/3 do ETL-BUDGET-PLANS)

> Gate final. 4 gates estáticos verdes localmente. Integração (constraints/idempotência em MySQL real)
> **deferida ao CI** — mesma razão da fatia 1 (a 3306 local esbarra no `erp-mysql` do legado).

## Gates estáticos (local) — verificados pelo orquestrador

| Gate | Comando | Resultado |
| :-- | :-- | :-- |
| Typecheck | `pnpm run typecheck` | ✅ verde (0 erros) |
| Format | `pnpm run format:check` | ✅ verde |
| Lint | `pnpm run lint` | ✅ verde |
| Test (puro, sem DB) | `pnpm test` | ✅ 4174 pass · **0 fail** · 19 skipped |

O `lint` estava vermelho no W2 (round 1) por `no-shadow` no teste de integração; corrigido no round 2
(`after` → `afterClose`, só rename). Round 2 APPROVED.

## Integração — DEFERIDA AO CI

Os testes gated (`MYSQL_INTEGRATION=1`, grupo `budget-plans`) — CA1 (pool 1× + close), CA2 (grava
legacy_id), CA3 (idempotência: 2ª provision = already-exists, sem duplicar, sem vazar UNIQUE), CA5
(host morto → Result err) — rodam no **CI**, não localmente. Causa idêntica à fatia 1: a 3306 está
ocupada pelo `erp-mysql` do legado (recurso de outro contexto, hook bloqueia) e o volume `mysql-data`
tem senha root divergente. Não é regressão do diff. O CI sobe MySQL efêmero limpo; o teste já está
registrado no runner (`scripts/ci/test-integration.ts`, grupo budget-plans).

## Cobertura local que sustenta o merge

- **Estrutural** (sempre roda): `typeof buildBudgetPlansEtlPort === 'function'`, CA5 sem DB (conn
  string malformada → Result err kebab `budget-plans-*`), CA4 fronteira ADR-0006 (seam existe +
  nenhum `scripts/etl` importa domínio/aplicação).
- **Idempotência (CA3)** garantida estruturalmente pelo design revisado no W2: `SELECT FOR UPDATE` por
  `legacy_id` + captura de `ER_DUP_ENTRY` no UNIQUE da fatia 1 → `already-exists`. Sem `ON DUPLICATE
  KEY` (ADR-0020). Prova runtime é o CI.

## Veredito

**GREEN (local) com integração deferida ao CI.** Porta de escrita completa, molde partners/financial,
sem migration nova. Fatia 2/3 pronta — destrava `BGP-ETL-READER-MAPPER` (fatia 3, o reader+mapper+main
e o sistema isolado em Docker).
