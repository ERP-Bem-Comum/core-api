# W1 — REPORT (GREEN) · FIN-COUNTERPART-INVESTMENT-REDEMPTION (#428)

> Wave 1 (implementação mínima até GREEN). Skill: `ts-domain-modeler` (+ schema/mapper). Estende a
> contrapartida esperada da conciliação de só `type='Transfer'` para **`Investment`** e **`Redemption`**,
> com propagação do **`type`** e do **`productLabel`** (decisão de design do humano, opção (a)) pela
> contrapartida até a perna espelho B. Movimento permanece agnóstico ao tipo (`opposite(originMovement)`).

## Arquivos alterados (produção — 6 + migration)

| Arquivo | Mudança |
| :-- | :-- |
| `src/modules/financial/domain/expected-counterpart/types.ts` | `ExpectedCounterpartType` += `'Investment' \| 'Redemption'`; agregado ganha `productLabel: string \| null` (imutável). Comentários de invariante atualizados. |
| `src/modules/financial/domain/expected-counterpart/expected-counterpart.ts` | `CreateExpectedCounterpartInput` ganha `type?: ExpectedCounterpartType` e `productLabel?: string \| null` (opcionais, default `'Transfer'`/`null` — preserva callers legados). `create` propaga `type: input.type ?? 'Transfer'` e `productLabel: input.productLabel ?? null`. Import de `ExpectedCounterpartType` como `import type`. |
| `src/modules/financial/adapters/persistence/mappers/expected-counterpart.mapper.ts` | `toType` whitelist aceita os 3 tipos; `toRow` grava `productLabel`; `toDomain` reidrata `productLabel: row.productLabel`. |
| `src/modules/financial/adapters/persistence/schemas/mysql.ts` | Coluna `product_label varchar(120)` nullable (espelha `fin_manual_entries.product_label`); CHECK `fin_expected_counterpart_type_chk` ampliado para `IN ('Transfer','Investment','Redemption')`. |
| `src/modules/financial/application/use-cases/record-manual-entry.ts` | Guard (linha ~149) aberto para `Transfer \| Investment \| Redemption` (fail-closed preservado p/ Payment/Receipt/FeePenaltyInterest e ausência de destino). Passa `type: input.type` (narrowed) + `productLabel` (spread condicional) ao `create`. |
| `src/modules/financial/application/use-cases/confirm-counterpart-match.ts` | Perna espelho B usa `type: counterpart.type` (tipo REAL) e `productLabel: counterpart.productLabel` (spread condicional, só quando não-nulo — satisfaz o guard `investment-requires-product`). |

Migration gerada por `pnpm run db:generate:financial`:
`src/modules/financial/adapters/persistence/migrations/mysql/0036_powerful_marrow.sql` (+ snapshot `meta/0036_snapshot.json` + `meta/_journal.json` idx 36).

### SQL do ALTER (0036_powerful_marrow.sql)

```sql
ALTER TABLE `fin_expected_counterpart` DROP CONSTRAINT `fin_expected_counterpart_type_chk`;--> statement-breakpoint
ALTER TABLE `fin_expected_counterpart` ADD `product_label` varchar(120);--> statement-breakpoint
ALTER TABLE `fin_expected_counterpart` ADD CONSTRAINT `fin_expected_counterpart_type_chk` CHECK (`fin_expected_counterpart`.`type` IN ('Transfer','Investment','Redemption'));
```

`product_label` é rótulo livre (não ID/ref) → sem necessidade de `utf8mb4_bin` manual. DROP+ADD do CHECK
é o padrão do Drizzle Kit para ampliar constraint; validação real do ALTER em MySQL 8.4 é do W3.

## Decisões de implementação

1. **`type`/`productLabel` opcionais no input de `create` (default `'Transfer'`/`null`).** O teste de
   integração `buildCounterpart` chama `create` sem `type`/`productLabel`; os testes novos passam ambos.
   Optar por opcionais mantém os callers legados verdes sem tocá-los (YAGNI). Com `exactOptionalPropertyTypes`,
   `productLabel?: string | null` aceita `null` explícito (usado no `buildWorld` do confirm) e omissão.
2. **Eventos (ponto 7): REUSO de `TransferCounterpart{Created,Matched,Discarded}`.** Payloads já agnósticos
   ao tipo; renomear quebraria o contrato do outbox/consumidores sem valor. Nenhum evento novo.
3. **Movimento agnóstico ao tipo (mantido).** `create` segue `opposite(input.originMovement)` — NÃO
   parametrizado por tipo. Resgate (origem Credit → destino Debit); Aplicação (origem Debit → destino Credit).
4. **`productLabel` REAL na perna espelho B (trava contra remendo).** `confirm-counterpart-match.ts` usa
   `counterpart.productLabel` via spread condicional (`!== null`). Para Investment/Redemption a
   contrapartida carrega o produto da origem, então a perna B nasce com o produto correto e passa o guard
   `investment-requires-product`; para Transfer o produto é nulo e não é propagado (Transfer não exige).
5. **`toRow`/`toDomain` do mapper** persistem/reidratam `productLabel`; `ExpectedCounterpartRow`
   (`$inferSelect`) já expõe `productLabel: string | null` automaticamente após a coluna nova.

## Prova do GREEN (saída real)

### 4 arquivos-alvo (`node --test`, sem `MYSQL_INTEGRATION`)

```
[financial:expected-counterpart-store] MYSQL_INTEGRATION não definido — pulando integração.
✔ expected-counterpart-store.drizzle-mysql.test.ts (skip limpo)
✔ CA2: confirmar consome a contrapartida (Matched) + concilia a transação de B + 0 duplicata
✔ contrapartida inexistente → counterpart-not-found
✔ CA4(#428): perna espelho B nasce com o tipo REAL da contrapartida (Investment), não Transfer fixo
✔ CA3(não-regressão): Transfer + destino → 1 contrapartida Pending em B
✔ CA1(#428): Investment + destino → 1 contrapartida Pending type=Investment (movement oposto)
✔ CA2(#428): Redemption + destino → 1 contrapartida Pending type=Redemption (origem Credit → Debit)
✔ CA3(não-regressão): sem destinationAccountRef → nenhuma contrapartida
✔ CA3(não-regressão): Payment mesmo COM destino → nenhuma contrapartida (fora dos 3 tipos)
✔ CA(#269): cria contrapartida Pending com movement oposto (origem Debit → Credit) + evento
✔ CA(#428): Investment → propaga type=Investment ao agregado
✔ CA(#428): Redemption → propaga type=Redemption
✔ movement oposto na direção inversa (origem Credit → Debit)
✔ valor não-positivo → counterpart-value-invalid
✔ destino == origem → counterpart-same-account
ℹ tests 15 · pass 15 · fail 0 · skipped 0
```

### Suíte completa (`pnpm test`) — regressão zero

```
ℹ tests 4017 · suites 1143 · pass 3998 · fail 0 · skipped 19 · todo 0
```

0 falhas. Os 19 `skipped` são testes gated (`MYSQL_INTEGRATION`/`*-compose`/docker off no Mac) + o skip
LGPD `native-pdf-real.local.test.ts` — todos pré-existentes e alheios ao #428. Nenhum RED colateral.

### Qualidade nos arquivos tocados

```
pnpm run typecheck        → tsc --noEmit (sem erros)
pnpm exec prettier --check <6 .ts>  → "All matched files use Prettier code style!"
pnpm exec eslint <6 .ts>  → sem output (0 erros)
```

(`.sql` não tem parser prettier — esperado; formatação de migration não se aplica.)

## O que o W2 deve auditar (foco)

1. **Não-regressão do Transfer (CA3).** Transfer cria exatamente como antes; Payment/Receipt/
   FeePenaltyInterest e qualquer tipo sem `destinationAccountRef` NÃO criam contrapartida. Guard em
   `record-manual-entry.ts` abriu para os 3 tipos preservando o fail-closed.
2. **`productLabel` REAL, não placeholder (CA4 estendido).** `confirm-counterpart-match.ts` usa
   `counterpart.productLabel` real (spread condicional), não `''`/placeholder nem relaxamento do guard
   `investment-requires-product`. Teste assere `manualEntry.productLabel === 'CDB Banco X'`.
3. **Movimento agnóstico ao tipo** — `create` mantém `opposite(originMovement)`, sem ramificar por tipo.
4. **Eventos não renomeados** — reuso de `TransferCounterpart*` (payload agnóstico).
5. **Migration coerente com o schema Drizzle** — CHECK ampliado + coluna nullable; validação do ALTER
   real em MySQL 8.4 é responsabilidade do W3 (CA5, gated `MYSQL_INTEGRATION`).
