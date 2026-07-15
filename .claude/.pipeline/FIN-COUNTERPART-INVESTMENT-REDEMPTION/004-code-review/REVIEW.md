# Code Review — FIN-COUNTERPART-INVESTMENT-REDEMPTION (#428) — Round 1

**Veredito:** APPROVED
**Reviewer:** `code-reviewer` (W2, read-only)
**Data:** 2026-07-15
**Escopo revisado:** 6 arquivos de produção + migration 0036

- `domain/expected-counterpart/{types.ts, expected-counterpart.ts}`
- `adapters/persistence/{mappers/expected-counterpart.mapper.ts, schemas/mysql.ts}`
- `adapters/persistence/migrations/mysql/0036_powerful_marrow.sql`
- `application/use-cases/{record-manual-entry.ts, confirm-counterpart-match.ts}`
- Contexto lido: `domain/reconciliation/manual-entry.ts` (guard), `events.ts`

---

## Foco 1 — Não-regressão do Transfer (CRÍTICO) → OK

`record-manual-entry.ts:149-152` estreita por 3 tipos **E** `destinationAccountId !== null`:

- **Transfer + destino:** cria idêntico ao anterior — `type='Transfer'`, `productLabel` não spreadado
  (Transfer não carrega produto) → `create` default `null`. Comportamento preservado.
- **Investment/Redemption + destino:** cria contrapartida (novo, intencional).
- **Payment/Receipt/FeePenaltyInterest (mesmo COM destino):** fora dos 3 tipos → **nada criado**.
- **Qualquer tipo SEM `destinationAccountRef`:** `destinationAccountId === null` → **nada criado**.

Fail-closed preservado em ambas as pernas do `&&`. Sem regressão.

## Foco 2 — `productLabel` real, sem remendo → OK

`confirm-counterpart-match.ts:123,126` usa `counterpart.type` e `counterpart.productLabel` **reais**
(spread condicional `!== null`), não `''`/placeholder. Guard `investment-requires-product`
(`manual-entry.ts:57-62`) **NÃO** foi relaxado — decisão (a) cumprida.

- **Robustez (invariante em cadeia):** uma contrapartida `Investment`/`Redemption` só existe se a
  **perna A** já passou o MESMO guard em `record-manual-entry.ts:120` (leg A falharia com
  `investment-requires-product` se `input.productLabel === undefined`). Logo `counterpart.productLabel`
  é garantidamente não-nulo para esses tipos, e a perna B satisfaz o guard sem remendo.
- Transfer: `productLabel` nulo → spread omite → guard não exige. Não propaga e não quebra.

## Foco 3 — Migration × schema Drizzle → OK

`0036_powerful_marrow.sql`: DROP+ADD do CHECK `IN ('Transfer','Investment','Redemption')` +
`ADD product_label varchar(120)` (nullable). Coerente com `mysql.ts:865` (`varchar(120)`, sem
`.notNull()`) e `:876-879` (CHECK 3 valores). `mapper.toType` (`:32-33`) aceita os 3 → `toDomain`
reidrata rows Investment/Redemption sem `invalid-expected-counterpart-type`. DDL (ampliar CHECK +
coluna nullable) é permitido pelo ADR-0020. Validação do ALTER real em MySQL 8.4 = W3 (CA5).

## Foco 4 — Qualidade + agnosticismo do movimento → OK

- `create` mantém `movement: opposite(input.originMovement)` (`expected-counterpart.ts:60`) — **sem
  ramificar por tipo**. Identidade contábil preservada para os 3 tipos.
- Domínio puro: sem `throw`/`class`/`this`/`any`; `Result`; `Readonly<>`; erro EN kebab.
- `import type { ExpectedCounterpartType }` (`:7-11`); extensões `.ts`.
- **Eventos NÃO renomeados** — `TransferCounterpart{Created,Matched,Discarded}` reusados; payload
  agnóstico (não carrega `type`). Único produtor `create` emite `TransferCounterpartCreated`. Contrato
  do outbox intacto.
- Comentários só explicam o "porquê" (#428). YAGNI respeitado (inputs opcionais preservam callers).

---

## Achados

### 🔴 Crítica — nenhuma

### 🟡 Importante — nenhuma

### 🔵 Sugestão (não-bloqueia)

- **`expected-counterpart.ts:28,57`** — `type?: ExpectedCounterpartType` opcional com default
  `'Transfer'`. Um futuro caller que esquecesse `type` num Investment cairia silenciosamente em
  `Transfer`. Risco baixo (único caller de produção passa `type` explícito; só o `buildCounterpart` de
  teste omite). Tornar `type` obrigatório e ajustar o caller de teste eliminaria o default latente.
  W1 justificou como YAGNI — aceitável.
- **`0036_powerful_marrow.sql:2`** — `ADD COLUMN` sem `AFTER` posiciona `product_label` no fim físico
  da tabela, enquanto o schema Drizzle a declara após `type`. Cosmético (Drizzle mapeia por nome); sem
  impacto funcional.

---

## O que está bom

- Guard de não-regressão robusto: estreitamento por tipo **e** presença de destino no mesmo `if`.
- Garantia de invariante em cadeia (leg A → contrapartida → leg B) faz o `productLabel` real fluir sem
  relaxar o guard nem usar placeholder — exatamente a decisão (a).
- Reuso disciplinado de eventos e do `movement` agnóstico evita churn de contrato.

## Próximo passo

**APPROVED** → W3 (`ts-quality-checker`): typecheck + format + lint + test + **migration/ALTER real em
MySQL 8.4 (CA5)** — round-trip Investment/Redemption gated `MYSQL_INTEGRATION`, caminho não-destrutivo.
