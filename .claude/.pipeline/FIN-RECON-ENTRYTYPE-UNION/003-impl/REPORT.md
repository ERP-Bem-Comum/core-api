# W1 — Implementação GREEN · FIN-RECON-ENTRYTYPE-UNION

**Skills:** ts-domain-modeler (VO) + drizzle-schema-author (CHECK/migration). **Resultado:** GREEN.

## Mudanças em `src/`

| Arquivo | Mudança |
| --- | --- |
| `domain/statement/entry-type.ts` (novo) | VO module-as-namespace (como `fitid.ts`): `EntryType` (10 valores), `EntryTypeError='invalid-entry-type'`, `VALUES`, `normalize(raw)` (bruto→canônico, fallback Other), `rehydrate(raw)` (rejeita fora do union) |
| `domain/statement/types.ts` | `entryType: string` → `EntryType` em `StatementTransaction` e `ParsedTransaction` (+ import) |
| `application/ports/bank-statement-parser.ts` | `entryType: string` → `EntryType` (port tipa o VO; normalização é do adapter parser) |
| `adapters/statement-parsers/ofx-parser.ts` | `entryType: EntryType.normalize(trnType)` (era `trnType` cru) |
| `adapters/statement-parsers/csv-parser.ts` | `entryType: EntryType.normalize(tipo)` (era `tipo` cru) |
| `adapters/persistence/mappers/statement.mapper.ts` | `+ 'invalid-statement-entry-type'`; `transactionRowToDomain` valida via `EntryType.rehydrate`; comentário atualizado |
| `adapters/persistence/schemas/mysql.ts` | `entry_type` `varchar(32)`→`varchar(16)` + CHECK `fin_statement_transactions_entry_type_chk IN (…10…)`; comentário atualizado |
| `migrations/mysql/0009_redundant_genesis.sql` (gerado) | `MODIFY entry_type varchar(16)` + `ADD CONSTRAINT … CHECK` |

## Ajustes em `tests/` (não-regressão por fechamento do tipo)

- 5 fixtures de tarifa bancária `entryType: 'TARIFA'` → `'Fee'` (manual-entry/period — http + use-case + drizzle).
- `bank-statement.test.ts`: `entryType: 'TED'` → `'TED' as const` (widening → `string` quebrava o fixture).
- `bank-statement-repository.drizzle-mysql.test.ts`: novo `it` CA5 (CHECK no DB via UPDATE cru).

## Verde (provas)

| Gate | Comando | Resultado |
| --- | --- | --- |
| Tipos | `pnpm run typecheck` | 0 erros |
| Unit (4 alvos W0) | `node --test …` | 18/18 pass |
| Não-regressão financial | `node --test tests/modules/financial/**` | **298 pass · 0 fail · 0 skip** |
| **Integração (Docker, MySQL real)** | `pnpm run test:integration:financial` | **exit 0**; `✔ CA5 (#159): CHECK rejeita entry_type fora do union` + CA7 round-trip/único |
| Formato | `pnpm run format:check` | All matched files use Prettier code style |
| Lint (arquivos tocados) | `pnpm exec eslint …` | exit 0 |

## Decisões de design

- **Normalização no parser** (não no use-case): o adapter conhece o formato (OFX `TRNTYPE` / CSV `tipo`) e produz `EntryType`; o port tipa o VO. `rehydrate` no mapper é a defesa round-trip; o CHECK é a defesa no DB.
- **CA1 (parser→Other) vs CA2/CA4 (mapper→err)** reconciliados: ingestão de arquivo nunca falha (fallback `Other`); valor fora do union *vindo do banco* (corrupção) é rejeitado em `toDomain` + barrado pelo CHECK.
- **Numeração da migration:** `db:generate` produziu `0009` (financial estava em `0008`). A faixa `0013` da Conciliação (épico #171) é diretriz de **merge** — renumeração/reconciliação do `_journal` acontece no rebase vs WT-1 (que detém `0009–0012`), nunca por SQL à mão. Ver `000-request.md §Coordenação de migration`.
