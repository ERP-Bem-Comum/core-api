# MySQL Best Practices — Biblioteca Offline

> Cópias offline de artigos curados sobre MySQL 8.x / 8.4 LTS em produção, indexados por tema para consulta rápida pelo agente [`mysql-database-expert`](../../../../.claude/agents/mysql-database-expert.md) e por humanos que tocam o módulo Contratos.
>
> **Regra de hierarquia (do CLAUDE.md raiz):**
> 1. ADRs do `handbook/architecture/adr/` — imutáveis, vencem.
> 2. Resto do `handbook/`.
> 3. `CLAUDE.md` raiz.
> 4. `.claude/skills/<skill>/SKILL.md`.
> 5. Esta biblioteca = **referência citável**, não normativa. Cita-se para sustentar a decisão; nunca contradiz ADR.

---

## Como o agente deve usar

- Antes de propor tuning, query plan ou DDL, **consultar o artigo relevante aqui** + o trecho correspondente do [`mysql-refman-8.4--oracle.md`](../mysql-refman-8.4--oracle.md).
- Citar literalmente quando justificar decisão ("ADR-0020 §X" + "best-practices/jusdb/0N §Y" + "refman §Z").
- Quando dois artigos discordarem, **vence o manual oficial**; em segundo lugar, o ADR; em último, o artigo de blog.

---

## Coleção: JusDB (mai/2026 → out/2025)

| # | Artigo | Tema central | Arquivo |
|---|---|---|---|
| 01 | MySQL Explained 2026: InnoDB, 8.4 LTS, Replication & Production Patterns | visão geral + decisões macro | [jusdb/01-mysql-explained-…](./jusdb/01-mysql-explained-innodb-8.4-replication-production-patterns.md) |
| 02 | binlog Retention, Rotation & Purge | binlog + PITR + replicação | [jusdb/02-binlog-retention-…](./jusdb/02-binlog-retention-rotation-purge.md) |
| 03 | wait_timeout, net_read_timeout & All Timeout Variables | timeouts cliente/servidor/pool + HikariCP alignment | [jusdb/03-timeout-variables-…](./jusdb/03-timeout-variables-production-guide.md) |
| 04 | JSON Column Performance | JSON indexing, functional/multi-valued index, trade-offs | [jusdb/04-json-column-performance.md](./jusdb/04-json-column-performance.md) |
| 05 | Deadlock Analysis: InnoDB Status & Safe Code | leitura de `SHOW ENGINE INNODB STATUS`, prevenção, retry | [jusdb/05-deadlock-analysis-…](./jusdb/05-deadlock-analysis-innodb-status.md) |
| 06 | Foreign Keys: 5.7 → 8.4 | FK strict checks, ON DELETE, performance, migrations | [jusdb/06-foreign-keys-…](./jusdb/06-foreign-keys-evolution-5.7-to-8.4.md) |
| 07 | InnoDB Buffer Pool Deep Dive | pages, chunks, eviction, midpoint insertion, hit ratio | [jusdb/07-innodb-buffer-pool-…](./jusdb/07-innodb-buffer-pool-pages-chunks-eviction.md) |
| 08 | Generated Columns: VIRTUAL/STORED + JSON index | derivar valores indexáveis | [jusdb/08-generated-columns-…](./jusdb/08-generated-columns-virtual-stored-json-index-extraction.md) |
| 09 | Optimizer Hints: INDEX, JOIN_ORDER, MAX_EXECUTION_TIME | direcionar planejador sem mexer em globais | [jusdb/09-optimizer-hints-…](./jusdb/09-optimizer-hints-index-join-order-max-execution-time.md) |
| 10 | Window Functions: ROW_NUMBER, LAG, LEAD, Running Totals | top-N, MoM, MA, percentil | [jusdb/10-window-functions-…](./jusdb/10-window-functions-row-number-lag-lead-running-totals.md) |
| 11 | InnoDB Redo Log Tuning | `innodb_redo_log_capacity`, checkpoint age, stalls | [jusdb/11-innodb-redo-log-tuning.md](./jusdb/11-innodb-redo-log-tuning.md) |
| 12 | 8.4 Audit Log Filter: Selective Logging for Compliance | filtros JSON, PCI/HIPAA/SOX/LGPD | [jusdb/12-audit-log-filter-…](./jusdb/12-audit-log-filter-compliance-logging.md) |

---

## Por categoria

### Arquitetura / visão geral
- [01 — Explained 2026](./jusdb/01-mysql-explained-innodb-8.4-replication-production-patterns.md)
- [06 — FK evolution](./jusdb/06-foreign-keys-evolution-5.7-to-8.4.md)

### Tuning de memória / I/O
- [07 — Buffer Pool](./jusdb/07-innodb-buffer-pool-pages-chunks-eviction.md)
- [11 — Redo Log](./jusdb/11-innodb-redo-log-tuning.md)

### Operação / runtime
- [02 — binlog](./jusdb/02-binlog-retention-rotation-purge.md)
- [03 — Timeouts + HikariCP](./jusdb/03-timeout-variables-production-guide.md)
- [05 — Deadlocks](./jusdb/05-deadlock-analysis-innodb-status.md)

### Modelagem / queries
- [04 — JSON columns](./jusdb/04-json-column-performance.md)
- [08 — Generated columns](./jusdb/08-generated-columns-virtual-stored-json-index-extraction.md)
- [09 — Optimizer hints](./jusdb/09-optimizer-hints-index-join-order-max-execution-time.md)
- [10 — Window functions](./jusdb/10-window-functions-row-number-lag-lead-running-totals.md)

### Compliance / auditoria
- [12 — Audit Log Filter](./jusdb/12-audit-log-filter-compliance-logging.md)
- [02 — binlog (PITR)](./jusdb/02-binlog-retention-rotation-purge.md)

---

## Conexão com o handbook

| Tema | Best practice | ADR / referência |
|---|---|---|
| Engine MySQL+InnoDB | 01 | [ADR-0013](../../../architecture/adr/0013-mysql-database-engine.md) |
| Dialeto único MySQL | 01, 04 | [ADR-0020](../../../architecture/adr/0020-mysql-only-supersedes-dual-dialect.md) |
| Isolamento por database (sem FK cross-mod) | 06 | [ADR-0014](../../../architecture/adr/0014-mysql-database-isolation.md) |
| Outbox | 02, 05 | [ADR-0015](../../../architecture/adr/0015-mysql-outbox-pattern.md) |
| Pool `mysql2` + driver | 03 | `src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts` |
| Schema/migrações Drizzle | 06, 08 | [`handbook/reference/drizzle/`](../../drizzle/) |
| Manual oficial | todos | [`../mysql-refman-8.4--oracle.md`](../mysql-refman-8.4--oracle.md) |
