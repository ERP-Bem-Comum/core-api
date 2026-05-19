# Ticket CTR-DB-SCHEMA-HARDENING

> **Categoria:** Schema hardening — charset/collation por tabela, lock semântico em upsert, limpeza herdada do dual-dialect, nome de FK.
> **Origem:** Audit [`handbook/reviews/0002-audit-adapters-persistence-mysql.md`](../../../handbook/reviews/0002-audit-adapters-persistence-mysql.md) §M1 + §M3 + §M6 + §L2.
> **Tamanho:** M — 0000_*.sql + snapshot + schema TS + 2 repos + 1 mapper + testes estruturais novos.
> **Sequência do audit:** #4 (último). Após este, todos os HIGH/MEDIUM/L2 do audit `0002` ficam endereçados.

---

## ⚠️ Skills obrigatórias

- 📚 [`database-theorist`](../../skills/database-theorist/SKILL.md) — fundamento "physical encoding ≠ logical comparison": collation governa ordering/equality, e mismatch entre tabelas relacionadas por FK é defeito de modelagem física que MySQL 8.4 detecta agressivamente.
- 🔧 [`database-engineer`](../../skills/database-engineer/SKILL.md) — operacionaliza `CONVERT TO CHARACTER SET ... COLLATE ...` no migrator, escolha de `utf8mb4_bin` em UUID columns (case-sensitive, fast compare), e semântica de `SELECT ... FOR UPDATE` em REPEATABLE READ.
- 🚦 [`pipeline-maestro`](../../skills/pipeline-maestro/SKILL.md) — orquestração W0→W3.

Citações literais:

- **Audit §M1:** *"Drizzle não emite charset por tabela; 8.4 rejeita FK com mismatch tipo/collation. Frágil entre Docker compose local e RDS gerenciado."*
- **Audit §M3:** *"`SELECT` por PK sem `FOR UPDATE` em REPEATABLE READ. Duas transações concorrentes podem ler 'não existe', ambas tentam INSERT → uma leva `ER_DUP_ENTRY` e o `safe()` traduz para `*-repo-unavailable`."*
- **Audit §M6:** *"comentário cita SQLite (banido por ADR-0020). Limpar."*
- **Audit §L2:** *"nome de FK `ctr_amendments_contract_id_ctr_contracts_id_fk` (44 chars) → `ctr_amend_contract_fk`."*
- **[ADR-0014](../../../handbook/architecture/adr/0014-...)** §"Atenção crítica" → fixa `utf8mb4_unicode_ci` no server-level. **Vence o audit `0002`** (que sugere `utf8mb4_0900_ai_ci`).

---

## Resolução do conflito audit `0002` (M1) ↔ ADR-0014

Audit `0002` §M1 propõe `utf8mb4_0900_ai_ci`. ADR-0014 fixa `utf8mb4_unicode_ci`. ADR vence (CLAUDE.md §"Hierarquia de regras" #1). Aplicamos `utf8mb4_unicode_ci` por tabela — alinha-se ao server-level e elimina o defeito que o audit aponta (mismatch entre tabela e server-default). UUID columns ficam em `utf8mb4_bin` (case-sensitive, otimiza comparação de literal UUID).

---

## Objetivo

Endurecer o schema MySQL contra três classes residuais:

1. **M1 — charset/collation por tabela**: declarar explícito em cada `CREATE TABLE` (`ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`); UUID columns (`id`, `contract_id`, `signed_document_ref`, `homologated_by`, `amendment_id`) em `COLLATE utf8mb4_bin`. Blinda contra default divergente entre instâncias.
2. **M3 — `SELECT ... FOR UPDATE`** no SELECT pré-INSERT/UPDATE em `persistContract` (contract-repo) e `save` (amendment-repo). Elimina o falso `*-repo-unavailable` em concorrência.
3. **M6 — comentário SQLite em `money.mapper.ts`**: SQLite foi banido pelo ADR-0020. Limpar.
4. **L2 — rename FK longo**: `ctr_amendments_contract_id_ctr_contracts_id_fk` (44 chars) → `ctr_amend_contract_fk` (21 chars). Edita schema TS + 0000_*.sql + snapshot JSON.

---

## Escopo

### O que entra

1. **`src/modules/contracts/adapters/persistence/migrations/mysql/0000_superb_inhumans.sql`** (edição in-place)
   - Cada `CREATE TABLE` ganha `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` ao final.
   - UUID columns ganham `COLLATE utf8mb4_bin` inline.
   - L2: a `ALTER TABLE ctr_amendments ADD CONSTRAINT ctr_amendments_contract_id_ctr_contracts_id_fk ...` vira `ctr_amend_contract_fk`.

2. **`src/modules/contracts/adapters/persistence/migrations/mysql/meta/0000_snapshot.json`**
   - Renomear key e `name` da entry `ctr_amendments_contract_id_ctr_contracts_id_fk` → `ctr_amend_contract_fk` (2 ocorrências).

3. **`src/modules/contracts/adapters/persistence/schemas/mysql.ts`**
   - Em `amendments`, substituir `.references(() => contracts.id)` no campo `contractId` por declaração table-level `foreignKey({ name: 'ctr_amend_contract_fk', columns: [t.contractId], foreignColumns: [contracts.id] })`.
   - Adicionar comentário forte: charset/collate aplicados em SQL manual porque drizzle-orm 0.45.2 não expõe API table-level; qualquer nova migration emitida pelo `drizzle-kit generate` precisa receber os mesmos `ENGINE=...COLLATE=...` manualmente.

4. **`src/modules/contracts/adapters/persistence/mappers/money.mapper.ts`** (M6)
   - Remover comentário das linhas 4-6 que cita SQLite.

5. **`src/modules/contracts/adapters/persistence/repos/contract-repository.drizzle.ts`** (M3)
   - Linha 66-69: `.select(...).where(...)` → `.select(...).where(...).for('update')`.

6. **`src/modules/contracts/adapters/persistence/repos/amendment-repository.drizzle.ts`** (M3)
   - Linha 59-62: idem.

7. **`tests/modules/contracts/adapters/persistence/schema-hardening.test.ts`** (novo)
   - CA-15..CA-21: guards estruturais sobre 0000_*.sql + schema TS + repos + mapper.

### O que NÃO entra

- Refatorar charset/collate para API Drizzle (não existe nessa versão). Anotar para inquiry quando suportarem.
- Migration nova `0001_*.sql` — edição in-place da `0000_*.sql` é mais limpa (zero ambiguidade de ordem de aplicação) já que migration ainda não rolou em prod.
- Outras issues do audit (L1, L3, L4, L5, NITs) — saem para inquiries.

---

## Decisões

### D1 — Edição in-place de `0000_*.sql` (não criar `0001_*.sql`)

| Critério | In-place 0000 | Nova migration 0001 |
| :-- | :-- | :-- |
| **Estado em produção** | nunca aplicada (`OUTBOX-MYSQL` ainda em planning; ADR-0020 ainda fresco) | mesma situação |
| Ambientes que rodam `__drizzle_migrations` | nenhum hoje | nenhum hoje |
| Risco de conflito de checksum | journal não tem checksum (verificado) | nenhum |
| Custo de manutenção | 1 arquivo, leitura linear | 2 arquivos, ALTER TABLE + SET FOREIGN_KEY_CHECKS |
| Limpeza do histórico | schema vem certo desde o primeiro CREATE | requer cirurgia conceitual no leitor futuro |

**Escolha**: in-place 0000. Mais simples e mais correto enquanto a migration nunca foi a prod.

### D2 — `utf8mb4_unicode_ci` (não `utf8mb4_0900_ai_ci`)

- ADR-0014 vence o audit (CLAUDE.md §"Hierarquia").
- `utf8mb4_unicode_ci` é a coleta padrão do server (`server.cnf` + `initdb.d/01-databases-and-users.sh`).
- O **defeito real** que o audit aponta é o **mismatch tabela ↔ default**, não o sabor específico da collation. Aplicar `utf8mb4_unicode_ci` por tabela elimina o mismatch totalmente.

### D3 — `utf8mb4_bin` em colunas UUID

- UUID v4 string `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx` é ASCII. `utf8mb4_bin` faz comparação binária — equality check **mais rápida** que collation case-insensitive (não precisa de processamento Unicode).
- Best-practice 06 §"Comparação por versão" recomenda.
- Aplicado em: `ctr_contracts.id`, `ctr_amendments.id`, `ctr_amendments.contract_id`, `ctr_amendments.signed_document_ref`, `ctr_amendments.homologated_by`, `ctr_contract_homologated_amendments.contract_id`, `ctr_contract_homologated_amendments.amendment_id`.
- **Crítico para FK**: ambos lados (`contracts.id` e `amendments.contract_id`) precisam da mesma collation, ou MySQL 8.4 rejeita o ADD CONSTRAINT com erro 3780/3784.

### D4 — `.for('update')` em SELECT pré-UPDATE/INSERT

- Refman §15.7 *InnoDB Locking* — `FOR UPDATE` adquire **next-key lock** na row existente OU **gap lock** se a row não existe.
- Dois caminhos:
  - **Row existe**: `SELECT FOR UPDATE` bloqueia; concorrente espera; depois faz o seu próprio UPDATE serializado. Sem `ER_DUP_ENTRY`.
  - **Row NÃO existe**: gap lock entre PKs adjacentes. Concorrente que tenta `SELECT FOR UPDATE` no mesmo PK aguarda. Quando a primeira transação commita o INSERT, o gap lock vira lock na row inserida; concorrente acorda, re-executa o `SELECT` (vê a row) e cai no branch UPDATE.
- Resultado: zero `ER_DUP_ENTRY` em condições de corrida normais. Em casos patológicos (deadlock cíclico), MySQL detecta e mata um — `safe()` traduz para `*-repo-unavailable` corretamente, refletindo um evento REAL.

### D5 — `foreignKey({ name: ... })` em `amendments` em vez de `.references()`

- Drizzle TS API atual permite ambos. `.references()` gera nome derivado longo; `foreignKey({ name })` permite custom.
- Edição mínima ao schema TS: substituir o `.references` no campo + adicionar `foreignKey` na `extraConfig` da tabela.
- O snapshot reflete o nome custom (verificado: a junção `ctr_chom_amends_*` já usa essa convenção).

### D6 — Guards estruturais via fs.read + regex

Mesmo padrão adotado em CTR-DB-REPO-LIST-N1 (CA-13/14) e CTR-DB-MAPPER-NO-THROW (grep). Justificativa: schema/collation/FK names são **invariantes de fato**; mudanças funcionais já são cobertas pela suíte contratual + suite integration `drizzle-mysql.test.ts`.

---

## Critérios de aceite (DoD)

- [ ] `0000_*.sql` contém `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` em 3 CREATE TABLE.
- [ ] `0000_*.sql` contém `COLLATE utf8mb4_bin` em UUID columns (mínimo 7 ocorrências entre as 3 tabelas).
- [ ] `0000_*.sql` NÃO contém o nome longo `ctr_amendments_contract_id_ctr_contracts_id_fk`.
- [ ] `0000_*.sql` contém `ctr_amend_contract_fk`.
- [ ] `0000_snapshot.json` espelha o nome novo da FK.
- [ ] `schemas/mysql.ts` declara `foreignKey({ name: 'ctr_amend_contract_fk', ... })` em `amendments`.
- [ ] `schemas/mysql.ts` tem comentário forte sobre charset/collate manual.
- [ ] `money.mapper.ts` não cita `SQLite`.
- [ ] `contract-repository.drizzle.ts` contém `.for('update')` no SELECT do `persistContract`.
- [ ] `amendment-repository.drizzle.ts` contém `.for('update')` no SELECT do `save`.
- [ ] CA-15..CA-21 verdes em `schema-hardening.test.ts`.
- [ ] Suíte contratual `runContractRepositoryContract` + `runAmendmentRepositoryContract` continuam verdes.
- [ ] `pnpm run typecheck` verde.
- [ ] `pnpm run format:check` verde.
- [ ] `pnpm test` verde.
- [ ] `pnpm run lint` verde (bonus).

---

## Referências cruzadas

- Audit: [`handbook/reviews/0002-audit-adapters-persistence-mysql.md`](../../../handbook/reviews/0002-audit-adapters-persistence-mysql.md) §M1, §M3, §M6, §L2, §3.
- ADR-0014: `handbook/architecture/adr/0014-*.md` — server-level `utf8mb4_unicode_ci`.
- ADR-0020: `handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md`.
- Best-practice MySQL: [`handbook/reference/mysql/best-practices/jusdb/05-deadlock-analysis-innodb-status.md`](../../../handbook/reference/mysql/best-practices/jusdb/05-deadlock-analysis-innodb-status.md) §3.
- Best-practice MySQL: [`handbook/reference/mysql/best-practices/jusdb/06-foreign-keys-evolution-5.7-to-8.4.md`](../../../handbook/reference/mysql/best-practices/jusdb/06-foreign-keys-evolution-5.7-to-8.4.md) §"Comparação por versão".
- Refman §15.7 *InnoDB Locking*.
- Tickets anteriores: [`CTR-DB-MAPPER-NO-THROW/`](../CTR-DB-MAPPER-NO-THROW/), [`CTR-DB-DRIVER-POOL-TUNING/`](../CTR-DB-DRIVER-POOL-TUNING/), [`CTR-DB-REPO-LIST-N1/`](../CTR-DB-REPO-LIST-N1/).
