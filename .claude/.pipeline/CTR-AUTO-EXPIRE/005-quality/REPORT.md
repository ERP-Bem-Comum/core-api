# W3 — CTR-AUTO-EXPIRE — Quality Gate (GREEN) ✓

**Outcome:** GREEN · **Data:** 2026-06-16 · **Gate:** ts-quality-checker

## Resultado dos 4 gates

```
pnpm run typecheck     → verde (tsc --noEmit)
pnpm run format:check  → verde (prettier --check . — All matched files use Prettier code style)
pnpm run lint          → verde (eslint . — 0 problems)
pnpm test              → 2488 testes · 2470 pass · 0 fail · 18 skipped (integration opt-in)
                         duration ~59.5s
```

## Correções aplicadas pós-W2 (antes do gate)

O W2 (APPROVED) recomendou aplicar 🟡-1/🟡-2 + 🔵 antes do W3. Todas aplicadas:

| Achado | Arquivo | Fix |
|---|---|---|
| 🟡-1 | `domain/contract/repository.ts` (comentário do port) | Comentário "FOR UPDATE SKIP LOCKED" → "SELECT … LIMIT simples, sem FOR UPDATE; multi-instância F-Plus via `GET_LOCK`/`UNIQUE` (ADR-0041)". Alinha ao adapter Drizzle. |
| 🟡-1 | `jobs/contracts/sweeper/config.ts:12` | Idem — comentário do `batchSize` alinhado à decisão CA5. |
| 🟡-2 | `shared/kernel/plain-date.ts` | Novo smart constructor `fromParts(year, month, day): PlainDate` — encapsula o cast `as PlainDate` no kernel. `fromDate` refatorado para reusá-lo. |
| 🟡-2 | `jobs/contracts/sweeper/clock-sao-paulo.ts` | Usa `PlainDate.fromParts(...)` no lugar do `immutable(...) as PlainDateType` inline; import `immutable` removido (órfão). |
| 🔵-3 | `clock-sao-paulo.ts` (comentário) | "DD/MM/AAAA (pt-BR)" → "en-CA / YYYY-MM-DD" (alinha comentário ao código). |
| 🔵-4 | `repos/contract-repository.in-memory.ts:94` | Typo "Decidão" → "Decisão". |
| 🔵-5 | `repos/contract-repository.in-memory.ts:117` | `a.id as unknown as string` → `String(a.id)` no `localeCompare`. |

## Regressão zero — 10 erros de lint latentes corrigidos

O W1 REPORT validou `typecheck` + `format:check` + `test`, mas **não rodou `lint`**. O gate W3 (que inclui `eslint`) revelou **10 erros**, todos no código do ticket. Política de regressão zero (AGENTS.md §): corrigidos agora, não dispensados.

| # | Arquivo:linha | Regra ESLint | Fix |
|---|---|---|---|
| 1 | `jobs/.../run.ts:55` | `promise-function-async` | Callback do `withNewCorrelation` → `async () =>` (mantém `<T>(fn:()=>T):T` + propagação ALS). |
| 2-3 | `jobs/.../run.ts:60` | `no-base-to-string` + `restrict-template-expressions` | `ContractRepositoryError` inclui `OutboxAppendError` (objetos tagged `{ tag }`, não string) → `typeof === 'string' ? e : JSON.stringify(e)` antes do template. |
| 4 | `repos/contract-repository.drizzle.ts:11` | `no-unused-vars` | Removido `import * as PlainDate` (só o `type PlainDate as PlainDateType` é usado; o adapter acessa `cutoff.year/month/day`). |
| 5-8 | `tests/.../sweeper.test.ts:82,83,124,128` | `require-await` | Fakes `async (...) => ok(...)` sem `await` → `(...) => Promise.resolve(ok(...))`. |
| 9-10 | `tests/.../find-expirable.mysql.test.ts:31,32` | `no-unused-vars` | Removidos imports `someFixedPeriod`/`someIndefinitePeriod` (os testes usam `buildContract`/`buildExpiredContract` com objetos literais). |

Comentários enganosos "FOR UPDATE SKIP LOCKED" no `sweeper.test.ts` (W0) também alinhados à decisão CA5, por consistência com o 🟡-1.

## Veredito

W3 **GREEN** nos 4 gates. Ticket pronto para `close`. Pendência de infra (cron 1×/dia em `ERP-INFRA`) permanece como issue separada, fora de `src/`.
