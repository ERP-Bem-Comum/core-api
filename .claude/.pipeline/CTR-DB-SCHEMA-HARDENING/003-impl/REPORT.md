# W1 — GREEN (Aplicação dos 4 sub-itens)

## Skill aplicada

`database-engineer` (modelagem aplicada — charset/collate por tabela, locking semântico em InnoDB).

---

## Arquivos modificados

### 1. `src/modules/contracts/adapters/persistence/migrations/mysql/0000_superb_inhumans.sql`

Edição **in-place** (justificado em `000-request.md` D1):

- **3 CREATE TABLE** ganharam `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.
- **7 colunas UUID** ganharam `COLLATE utf8mb4_bin` inline:
  - `ctr_amendments`: `id`, `contract_id`, `signed_document_ref`, `homologated_by`.
  - `ctr_contract_homologated_amendments`: `contract_id`, `amendment_id`.
  - `ctr_contracts`: `id`.
- **L2**: FK renomeada na linha 57 — `ctr_amendments_contract_id_ctr_contracts_id_fk` → `ctr_amend_contract_fk`.

### 2. `src/modules/contracts/adapters/persistence/migrations/mysql/meta/0000_snapshot.json`

- 2 ocorrências de `ctr_amendments_contract_id_ctr_contracts_id_fk` substituídas por `ctr_amend_contract_fk` (chave do objeto + campo `name`).

### 3. `src/modules/contracts/adapters/persistence/schemas/mysql.ts`

- **Header reescrito** com bloco *"⚠️ CHARSET/COLLATE — aplicado em SQL manual"* detalhando que `drizzle-orm@0.45.x` não expõe `charset`/`collate` table-level e que **qualquer nova migration emitida via `drizzle-kit generate` precisa receber os mesmos `ENGINE=...COLLATE=...` manualmente**. Responsabilidade do próximo dev anotada.
- **`amendments.contractId`**: `.references(() => contracts.id)` removido do campo (`varchar(...).notNull()` apenas).
- **`amendments` extraConfig**: adicionado `foreignKey({ name: 'ctr_amend_contract_fk', columns: [t.contractId], foreignColumns: [contracts.id] })` ao lado do índice existente.

### 4. `src/modules/contracts/adapters/persistence/mappers/money.mapper.ts`

- Comentário de 3 linhas reescrito: removida menção a SQLite (`integer` 8-byte). Permanece apenas a explicação sobre `bigint` MySQL + `Money.fromCents` ≤ `MAX_SAFE_INTEGER`.

### 5. `src/modules/contracts/adapters/persistence/repos/contract-repository.drizzle.ts`

- `persistContract` linha 66-69: `.where(...)` → `.where(...).for('update')`.
- Comentário inline citando audit §M3 + Refman §15.7 *InnoDB Locking*.

### 6. `src/modules/contracts/adapters/persistence/repos/amendment-repository.drizzle.ts`

- `save` linha 59-62: idem.
- Comentário inline.

---

## Decisões aplicadas (registradas no `000-request.md`)

| Decisão | Implementação | Resultado |
| :-- | :-- | :-- |
| D1 — edição in-place da `0000_*.sql` | journal sem checksum (verificado em `_journal.json`); migration nunca aplicada em prod | sem cirurgia de ALTER TABLE; schema vem certo no primeiro CREATE |
| D2 — `utf8mb4_unicode_ci` (não `utf8mb4_0900_ai_ci`) | ADR-0014 vence audit | alinhado ao server `initdb.d/01-databases-and-users.sh` e `docker/mysql/conf.d/server.cnf` — zero mismatch |
| D3 — UUIDs em `utf8mb4_bin` | 7 colunas | comparação binária ASCII rápida; elimina drift Unicode em FK matches |
| D4 — `.for('update')` em 2 repos | `persistContract` + `save` | gap lock no PK ausente; sem ER_DUP_ENTRY falso |
| D5 — `foreignKey({ name })` em `amendments` | substitui `.references()` no campo | nome curto preservado quando `drizzle-kit generate` rodar |
| D6 — guards estruturais via `fs.read` + regex | 10 asserções CA-15..CA-23 | regression-determinístico, roda sem Docker |

---

## Resultados

```
$ pnpm run typecheck
EXIT=0

$ pnpm test
ℹ tests 464 | pass 451 | fail 0 | skipped 13 | duration_ms 38554
EXIT=0

$ pnpm run format
(1 arquivo reformatado — schema-hardening.test.ts)

$ pnpm run format:check
All matched files use Prettier code style!
EXIT=0

$ pnpm run lint
EXIT=0
```

**Delta de testes vs baseline pré-ticket** (CTR-DB-REPO-LIST-N1 W3):

| Métrica | Antes | Agora | Δ |
| :-- | :-- | :-- | :-- |
| Total | 454 | 464 | **+10** (10 CAs novos) |
| Pass | 441 | 451 | **+10** |
| Fail | 0 | 0 | 0 |
| Skipped | 13 | 13 | 0 |

---

## Verificação visual dos sub-itens

| Sub-item | Comprovação |
| :-- | :-- |
| **M1** charset por tabela | `grep -c "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci" 0000_*.sql` = 3 |
| **M1** UUIDs em utf8mb4_bin | `grep -c "varchar(36)[^,]*COLLATE utf8mb4_bin" 0000_*.sql` ≥ 7 |
| **M3** contract-repository | `.where(...).for('update')` aparece dentro do `persistContract` |
| **M3** amendment-repository | `.where(...).for('update')` aparece dentro do `save` |
| **M6** money.mapper sem SQLite | `grep -i "SQLite" money.mapper.ts` retorna 0 hits |
| **L2** nome curto da FK | `grep -c "ctr_amend_contract_fk" 0000_*.sql` = 1; `grep -c "ctr_amendments_contract_id_ctr_contracts_id_fk" 0000_*.sql` = 0 |
| **L2** snapshot espelhado | `grep -c "ctr_amend_contract_fk" 0000_snapshot.json` ≥ 2; nome longo = 0 |
| **L2** schema TS declarativo | `foreignKey({ name: 'ctr_amend_contract_fk' ... })` no `amendments` |

---

## Comportamento preservado

Suíte contratual (`runContractRepositoryContract` + `runAmendmentRepositoryContract` em `contract-repository.suite.ts`/`amendment-repository.suite.ts`):

- Round-trip de campos: ✅ passou.
- `list em repo vazio`, `list retorna todos`, idempotência de `save`: ✅ passou.
- Constraints (NOT NULL, UNIQUE, CHECK): ✅ passou.

Nenhum cenário funcional foi tocado. Mudanças são **encoding** (charset/collate), **lock** (`FOR UPDATE`), **comentário** (M6) e **nome** (L2) — tudo abaixo do contrato observável da port.

---

## Critério de saída do GREEN

- [x] `0000_*.sql` com `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` em 3 CREATE TABLE.
- [x] UUIDs com `COLLATE utf8mb4_bin` (7 ocorrências).
- [x] FK longa removida; FK curta presente.
- [x] Snapshot espelha rename.
- [x] Schema TS declara `foreignKey` custom + comentário forte.
- [x] `money.mapper.ts` sem `SQLite`.
- [x] 2 repos com `.for('update')` no SELECT pré-upsert.
- [x] CA-15..CA-23 verdes (10 testes).
- [x] Suíte contratual verde.
- [x] `typecheck`, `format:check`, `lint`, `test` todos verdes.

**Pronto para W2.**
