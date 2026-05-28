# W3 — Gate de qualidade

> Outcome: **ALL-GREEN (escopo)** — a única falha remanescente em cada suíte pertence
> a outro ticket aberto.

## Gate estático

| Comando | Resultado |
| --- | --- |
| `pnpm run typecheck` | ✅ 0 erros |
| `pnpm run format:check` | ✅ Prettier ok |
| `pnpm run lint` | ✅ 0 erros |

## `test:integration` (alvo do ticket)

`CA-6: fluxo Addition completo (criar → aditivo → anexar → homologar)` → **✅ PASS**.

Suíte: **82 tests · 81 pass · 1 fail**. A única falha é `CA-I2` (outbox `SKIP LOCKED`),
do ticket `CTR-OUTBOX-SKIPLOCKED-DUP` — fora de escopo. Antes deste fix eram 2 falhas
(CA-6 + CA-I2); CA-6 agora verde.

## `pnpm test` (default)

**1197 tests · 1180 pass · 1 fail · 16 skipped**. A única falha é `CA-5: readonly_bi
consegue SELECT` (`tests/infra/mysql-compose.test.ts`), do ticket
`CTR-INFRA-READONLY-BI-GRANT` — fora de escopo. O CA-6 corrigido não roda aqui (gated
por `MYSQL_INTEGRATION=1`), apenas no `test:integration`.

## Critérios de aceitação

- CA1 — `CA-6` verde no `test:integration`: ✅
- CA2 — expectativa do teste reflete o contrato atual (documento existente exigido),
  sem `assert` mentiroso: ✅
