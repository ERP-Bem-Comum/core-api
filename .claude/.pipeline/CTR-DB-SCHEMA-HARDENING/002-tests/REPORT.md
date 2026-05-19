# W0 — RED (Fail-First)

## Skill aplicada

`database-engineer` (guards estruturais de schema).

---

## Arquivos criados

- `tests/modules/contracts/adapters/persistence/schema-hardening.test.ts` (170 linhas, 9 `it` em 9 `describe`).

## CAs do W0

| CA | Verifica | Estado hoje | Sub-item do audit |
| :-- | :-- | :-- | :-- |
| CA-15   | `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` em 3 CREATE TABLE | RED | §M1 |
| CA-16   | ≥ 7 `varchar(36) ... COLLATE utf8mb4_bin` no SQL | RED | §M1 |
| CA-17   | `0000_*.sql` sem `ctr_amendments_contract_id_ctr_contracts_id_fk` | RED | §L2 |
| CA-18   | `0000_*.sql` com `ctr_amend_contract_fk` | RED | §L2 |
| CA-19   | snapshot sem nome longo | RED | §L2 |
| CA-19.2 | snapshot com nome curto | RED | §L2 |
| CA-20   | `contract-repository.drizzle.ts` com `.for('update')` no `persistContract` | RED | §M3 |
| CA-21   | `amendment-repository.drizzle.ts` com `.for('update')` no `save` | RED | §M3 |
| CA-22   | `money.mapper.ts` sem citar `SQLite` | RED | §M6 |
| CA-23   | `schemas/mysql.ts` declara `foreignKey({ name: 'ctr_amend_contract_fk' })` | RED | §L2 |

## Verificação do RED

```
$ pnpm test --test-name-pattern="CTR-DB-SCHEMA-HARDENING"
ℹ tests 464 | pass 441 | fail 10 | skipped 13
✖ CA-15 ✖ CA-16 ✖ CA-17 ✖ CA-18 ✖ CA-19 ✖ CA-19.2 ✖ CA-20 ✖ CA-21 ✖ CA-22 ✖ CA-23
EXIT=1
```

**10 fails — todas as 10 asserções introduzidas estão RED**, refletindo o estado pré-hardening do schema/repos/mapper. Cada falha aponta ao sub-item do audit (§M1/M3/M6/L2) na mensagem.

---

## Cobertura comportamental preservada

A suíte contratual `runContractRepositoryContract` + `runAmendmentRepositoryContract` (em `tests/modules/contracts/adapters/persistence/{contract,amendment}-repository.suite.ts`) cobre:

- Round-trip de campos.
- Upsert idempotente (exercita `persistContract` e `save`).
- `list` shape.
- Constraints (NOT NULL, UNIQUE, CHECK) — quando a suíte for executada via `pnpm test:integration`.

Pós-W1, estes cenários continuam passando — schema hardening é encoding/lock fortalecido, não muda contrato funcional.

---

## Critério de saída do RED

- [x] Arquivo de teste criado.
- [x] `pnpm test` mostra 10 fails específicos.
- [x] Cada fail referencia o sub-item do audit.
- [x] Nenhuma falha foi acidental (CTR-DB-REPO-LIST-N1 continua verde — sem cross-talk).

**Pronto para W1.**
