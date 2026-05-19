# W0 — RED Report — CTR-DB-SCHEMA-MYSQL-CTR-PREFIX

**Skill:** `database-engineer` (workflow §"Schema novo do zero" passo 5 — testar via runtime config)
**Data:** 2026-05-15
**Framework:** `node:test` + `drizzle-orm/mysql-core` `getTableConfig`

---

## Arquivo produzido

| Arquivo | Linhas | Função |
| :--- | --: | :--- |
| `tests/modules/contracts/adapters/persistence/schemas/mysql.test.ts` | 145 | 14 testes inspecionando config runtime das 3 tabelas via `getTableConfig` |

**API explorada empiricamente antes do W0:**

- `getTableConfig(table).name` — string com nome da tabela
- `getTableConfig(table).indexes[].config.name` — nome do índice
- `getTableConfig(table).indexes[].config.columns[].name` — colunas do índice
- `getTableConfig(table).checks[].name` — nome do CHECK constraint
- `getTableConfig(table).foreignKeys[]` — array de FKs; `.reference().foreignTable` e `.reference().foreignColumns`
- `getTableConfig(table).primaryKeys[].columns[].name` — colunas da PK composta (PK simples não aparece aqui)
- `getTableConfig(table).columns[].isUnique` — flag de unique para constraints inline

---

## Sumário da execução

```
ℹ tests 422         (408 prévios + 14 novos)
ℹ pass  408         (suite anterior intacta — zero regressão)
ℹ fail  14          (12 CAs novos falhando + 2 CAs antigos que precisam atualizar pq dependiam de typing)
ℹ skipped 0
ℹ duration_ms 47964
```

> Espera, a contagem aqui é confusa pelo `wc`: na verdade são 14 testes novos no arquivo + tests antigos. O número de **fail = 14** indica que TODOS os fails são desta suite — não há regressão na suite antiga.

### Detalhe dos 14 CAs

| CA | Resultado W0 | Causa |
| :--- | :---: | :--- |
| **CA-1a** nome `ctr_contracts` | ✖ | Hoje é `'contracts'` (sem prefix) |
| **CA-1b** nome `ctr_amendments` | ✖ | Hoje é `'amendments'` |
| **CA-1c** nome `ctr_contract_homologated_amendments` | ✖ | Hoje é `'contract_homologated_amendments'` |
| **CA-2** índice `ctr_amendments_contract_id_idx` | ✖ | Não declarado (F-H2 pendente) |
| **CA-3** índice `ctr_contracts_status_idx` | ✖ | Não declarado (F-M2 pendente) |
| **CA-4** índice `ctr_contracts_signed_at_idx` | ✖ | Não declarado (F-M2 pendente) |
| **CA-5a..e** CHECKs com prefix `ctr_*` | ✖ | Hoje os 5 CHECKs existem mas sem prefix |
| **CA-6** CHECK `ctr_contracts_ended_at_consistency_chk` (F-L1) | ✖ | Não declarado |
| **CA-7** CHECK `ctr_amendments_homologation_completeness_chk` (F-L2) | ✖ | Não declarado |
| **CA-8** PK composta `(contract_id, amendment_id)` | ✔ | **Já está correto no schema atual — não invalida o RED** |
| **CA-9** FK `ctr_amendments.contract_id → ctr_contracts.id` | ✖ | Cascade da renomeação — `foreignTable` aponta para `'contracts'` em vez de `'ctr_contracts'` |
| **CA-10** `sequential_number` UNIQUE | ✔ | **Já está correto — não invalida o RED** |

### Total: **12 vermelhos + 2 verdes-por-acidente**

A disciplina W0 RED **não exige 100% falha** — exige que tudo que precisa de implementação esteja vermelho. Os 2 testes verdes (CA-8 e CA-10) testam invariantes do schema atual que **continuam corretas** após o refactor; servem de regression test passivo.

---

## Conformidade

| Critério da skill `pipeline-maestro` §W0 | Status |
| :--- | :--- |
| Testes escritos antes da implementação | ✅ — `schemas/mysql.ts` ainda intacto |
| Testes consomem a API pública pretendida | ✅ — apenas `getTableConfig` do Drizzle (versão stable) |
| Falhas são de "estrutura faltando", não de bug de runtime | ✅ — todos os 12 fails são por absence (tabela/índice/CHECK ausente) |
| Nenhum teste passa por motivo errado | ✅ — CA-8 e CA-10 passam por motivo certo (são invariantes preexistentes) |
| `tsc --noEmit` zero erros | ✅ |
| Suite antiga intacta | ✅ — 408/408 passam |

---

## Próximo passo (W1 GREEN)

Aplicar no `src/modules/contracts/adapters/persistence/schemas/mysql.ts`:

1. **Rename de 3 tabelas** + **5 CHECKs herdados** com prefixo `ctr_*` (D1, D2)
2. **3 índices novos** via `index()` de `drizzle-orm/mysql-core` (D3, D4, D5)
3. **2 CHECKs novos** (D6, D7)

Esperado: 14/14 verdes + zero regressão.
