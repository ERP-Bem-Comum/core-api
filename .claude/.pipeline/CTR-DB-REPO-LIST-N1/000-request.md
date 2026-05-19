# Ticket CTR-DB-REPO-LIST-N1

> **Categoria:** Performance / pool exhaustion / antipadrão N+1.
> **Origem:** Audit [`handbook/reviews/0002-audit-adapters-persistence-mysql.md`](../../../handbook/reviews/0002-audit-adapters-persistence-mysql.md) §H1 + §M4.
> **Tamanho:** M — 1 arquivo de produção (`repos/contract-repository.drizzle.ts`), 1 arquivo de teste novo (regression guards), suite contratual existente continua passando.
> **Sequência do audit:** #3 (após `CTR-DB-DRIVER-POOL-TUNING`, antes de `CTR-DB-SCHEMA-HARDENING`).

---

## ⚠️ Skills obrigatórias

- 🔧 [`database-engineer`](../../skills/database-engineer/SKILL.md) — operacionaliza o JOIN aplicativo (1+1 query agrupada por Map em vez de 1+N).
- 📚 [`database-theorist`](../../skills/database-theorist/SKILL.md) — fundamento "physical query plan ≠ relational expression": Codd diz que a equivalência é semântica, não computacional. N+1 é antipadrão clássico em qualquer DBMS.
- 🚦 [`pipeline-maestro`](../../skills/pipeline-maestro/SKILL.md) — orquestração W0→W3.

Citações literais:

- **Audit §H1:** *"para cada `contracts.row`, abre uma query separada em `ctr_contract_homologated_amendments`. 1k contratos = 1+1000 round-trips no mesmo `connectionLimit:10` → satura pool."*
- **Audit §M4:** *"`for (...) await tx.insert(...).values({...})` = N round-trips. Drizzle aceita `values([...])` em batch."*
- **ADR-0020 §SQL permitido:** *"SELECT/INSERT/UPDATE/DELETE, JOIN, FK, transações, índices, CHECK, agregações simples, ON DUPLICATE KEY UPDATE, window functions, CTEs recursivas, FULLTEXT"* — `inArray` (gera `WHERE col IN (?, ?, ...)`) e `values([...])` (multi-row INSERT) são primitivas SQL banais; nenhum item proibido.

---

## Objetivo

Eliminar duas latências de I/O escalando-com-N (uma em leitura, outra em escrita) no único repo Drizzle do módulo Contracts, **sem mudar comportamento observável** (mesma suíte contratual passa antes e depois).

1. **H1 — `list()` 1+N → 1+1**: substituir o loop sequencial que faz 1 SELECT na junction **por contrato** por 1 único SELECT com `inArray(contract_id, ids)` + agrupamento `Map<contractId, amendmentIds[]>` no app.
2. **M4 — `persistContract` junction insert em batch**: substituir `for (...) await tx.insert(...).values({...})` por `tx.insert(...).values([...])` num único round-trip.

---

## Escopo

### O que entra

1. **`src/modules/contracts/adapters/persistence/repos/contract-repository.drizzle.ts`**
   - **H1**: reescrever `list()` (linhas 136-150 hoje) — 1 SELECT no `contracts`, 1 SELECT na junction com `inArray(contractId, ids)`, `Map` para agrupar, loop puro no app para `buildContract`.
   - **M4**: reescrever junction insert no `persistContract` (linhas 84-88 hoje) — `tx.insert(schema.contractHomologatedAmendments).values(rows)` com array.
   - Acrescentar `inArray` ao `import { eq } from 'drizzle-orm'`.
   - Comentários inline citando audit §H1/§M4.

2. **`tests/modules/contracts/adapters/persistence/contract-repository.shape.test.ts`** (novo)
   - **CA-13** (regression guard): leitura do source do repo via `fs.readFileSync` + assert que o padrão N+1 (loop com `await db.select()` dentro de `list`) sumiu.
   - **CA-14** (regression guard): mesmo para `persistContract` — junction insert NÃO usa loop `for ... await tx.insert(...).values({...})`.

### O que NÃO entra

- `amendment-repository.drizzle.ts` — não tem N+1 (verificado: só `findById` por amendment, sem expandir contratos).
- Mudança na **suíte contratual** existente — ela já valida correção funcional do `list()` e do upsert da junction. Roda inalterada como rede de segurança.
- Outras issues do audit (M1, M3, M6, L*).
- Otimização adicional (índice em `amendment_id` na junction — L4 — é ticket separado se a query reversa aparecer).
- `loadContract` (findById) e `loadBySequentialNumber` — fazem 1 contrato + 1 query na junction = constante, não N. Não tocar.

---

## Decisões

### D1 — Por que `inArray` em vez de JOIN

| Abordagem | Prós | Contras |
| :-- | :-- | :-- |
| **JOIN no Drizzle** (`leftJoin`) | 1 round-trip apenas | Cartesiano: M contratos × N amendments médios por contrato = MN rows; deduplica no app por `contractId`; map mais complexo. |
| **`inArray` + 2 queries + Map** (escolhido) | 1+1 round-trips constantes. Sem cartesiano. Map de agrupamento O(M+N). Mais simples de auditar. | 1 round-trip a mais que JOIN puro. Irrelevante em RDS (ms vs ms). |

Decisão: **`inArray` + Map**. Mais robusto, menos código, sem armadilha de DISTINCT/dedupe. Coerente com o exemplo literal do audit §H1.

### D2 — `values([...])` em batch para junction

Drizzle aceita `insert(...).values([row1, row2, ...])` como múltiplas-rows INSERT (Refman §13.2.6: *INSERT ... VALUES (row1), (row2)* — ADR-0020 §SQL permitido). 1 round-trip independente do tamanho. Mantém transação aberta no `persistContract` (RN do upsert atômico).

### D3 — Regression guard estrutural (CA-13/CA-14)

Meta-teste lendo o source via `fs.readFileSync` + regex sobre o padrão proibido. Justificativa: a correção **funcional** já é coberta pela suite contratual; o que falta é **regressão de performance**, que é difícil de testar deterministicamente sem instrumentar mysql2. Guard estrutural é determinístico, roda em CI sem container, e dá sinal claro se alguém reintroduzir N+1.

**Aceitabilidade do meta-teste**: caso particular pré-existente no projeto — `tests/cleanup/sqlite-removal.test.ts` faz exatamente o mesmo padrão (lê arquivos e valida padrões ausentes). Convergente com o estilo do repo.

### D4 — Conservar `safe()` wrapper e `buildContract` helper

`safe()` continua na borda; `buildContract` (que converte `(row, amendmentIds[]) → Result<Contract, ...>`) é reaproveitável sem mudança. Apenas a coleta dos `amendmentIds` muda.

---

## Critérios de aceite (DoD)

- [ ] `list()` faz exatamente **2 queries** independente do número de contratos: 1 em `ctr_contracts` + 1 em `ctr_contract_homologated_amendments` com `WHERE contract_id IN (...)`.
- [ ] Padrão `for (const row of rows) { ... await db.select() ... }` removido do `list()`.
- [ ] `persistContract` junction insert: `tx.insert(schema.contractHomologatedAmendments).values(rows)` com array. Skip se vazio.
- [ ] Padrão `for (...) await tx.insert(...).values({...})` removido.
- [ ] `inArray` importado de `drizzle-orm`.
- [ ] Suíte contratual `runContractRepositoryContract` continua passando (inalterada).
- [ ] CA-13 (regression guard `list`) verde.
- [ ] CA-14 (regression guard `persistContract`) verde.
- [ ] `pnpm run typecheck` verde.
- [ ] `pnpm run format:check` verde.
- [ ] `pnpm test` verde.
- [ ] `pnpm run lint` verde (bonus).

---

## Referências cruzadas

- Audit: [`handbook/reviews/0002-audit-adapters-persistence-mysql.md`](../../../handbook/reviews/0002-audit-adapters-persistence-mysql.md) §H1, §M4, §3.
- ADR-0020: [`handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md`](../../../handbook/architecture/adr/0020-mysql-only-supersedes-dual-dialect.md) §SQL permitido.
- Best-practice MySQL: [`handbook/reference/mysql/best-practices/jusdb/07-innodb-buffer-pool-pages-chunks-eviction.md`](../../../handbook/reference/mysql/best-practices/jusdb/07-innodb-buffer-pool-pages-chunks-eviction.md) §"Sinais de pressão".
- Drizzle docs: [`handbook/reference/drizzle/`](../../../handbook/reference/drizzle/) — `inArray` operator + multi-row INSERT.
- Tickets anteriores: [`.claude/.pipeline/CTR-DB-MAPPER-NO-THROW/`](../CTR-DB-MAPPER-NO-THROW/), [`.claude/.pipeline/CTR-DB-DRIVER-POOL-TUNING/`](../CTR-DB-DRIVER-POOL-TUNING/).
