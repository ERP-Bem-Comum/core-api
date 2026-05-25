# W2 — Code Review CTR-OUTBOX-SCHEMA

**Veredito: APPROVED**
**Round:** 1/3
**Skill:** `code-reviewer` + `database-engineer`
**Data:** 2026-05-21

---

## Checklist ADRs

| ADR | Item auditado | Resultado |
|:----|:--------------|:----------|
| ADR-0014 | `ctr_outbox` e `ctr_outbox_dead_letter` com prefix `ctr_*` | PASS |
| ADR-0014 | `eventos_processados` sem prefix — exceção cross-módulo documentada no schema e no `000-request.md` | PASS |
| ADR-0015 | 3 tabelas (outbox, DLQ, idempotência consumer) previstas na spec do ADR | PASS |
| ADR-0015 | Fluxo worker (INSERT pendente → processed_at NULL → mark → DLQ) documentado nos comentários | PASS |
| ADR-0020 | Sem `JSON` nativo — payload em `VARCHAR(8192)` com comentário justificado | PASS |
| ADR-0020 | Sem `ENUM` — `aggregate_type` em `VARCHAR(32)` com CHECK `IN (...)` | PASS |
| ADR-0020 | Sem `AUTO_INCREMENT` em PK de domínio — PKs são `CHAR(36)` UUID v4 | PASS |
| ADR-0020 | `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` em todas as 3 tabelas na migration | PASS |
| ADR-0020 | `COLLATE utf8mb4_bin` em todas as colunas `event_id`, `aggregate_id` (comparação binária em UUIDs) | PASS |

---

## Auditoria por arquivo

### `src/modules/contracts/adapters/persistence/schemas/mysql.ts` (linhas 191-305)

| Linha | Avaliação |
|:------|:----------|
| 206-244 | `ctrOutbox` — estrutura correta; 3 CHECKs + 2 índices declarados via `(t) => [...]`. |
| 210 | `char('event_id', { length: 36 }).primaryKey().notNull()` — PK UUID v4, sem `AUTO_INCREMENT`. PASS. |
| 224 | `processedAt` sem `.notNull()` — correto: NULL = pendente. |
| 226 | `.default(0)` em `attempts` — redundante com CHECK `>= 0`, porém não conflita; melhora DX em INSERTs sem attempts explícito. PASS. |
| 232-236 | 3 CHECKs via `check(name, sql\`...\`)` — nomes seguem convenção `ctr_<tabela>_<descricao>_chk`. PASS. |
| 240 | `index('ctr_outbox_processed_at_occurred_at_idx').on(t.processedAt, t.occurredAt)` — ordem correta: `processed_at` primeiro para NULLs agrupados (ADR-0015 §"Sobre o índice"). PASS. |
| 251-280 | `ctrOutboxDeadLetter` — sem FK com `ctr_outbox` (correto: row da DLQ é cópia independente). |
| 265 | `attempts: smallint('attempts').notNull()` — sem `.default(0)` intencional (DLQ registra total de tentativas realizadas, não inicia em zero). PASS. |
| 271-279 | 1 CHECK + 1 índice — DLQ tem apenas `aggregate_type_chk` (sem CHECK `attempts_nonneg` pois DLQ já representa estado final; sem CHECK `event_type_nonempty` porque seria redundante com a origem). Opção aceitável. |
| 289-304 | `eventosProcessados` — PK composta `(consumerId, eventId)` via `primaryKey({ columns: [...] })`. PASS. |
| 294 | `eventId` sem FK referenciando `ctr_outbox` — correto: tabela cross-módulo sem acoplamento direto. PASS. |
| 303 | `index('eventos_processados_processed_at_idx').on(t.processedAt)` — suporte a auditoria temporal. PASS. |

### `src/modules/contracts/adapters/persistence/migrations/mysql/0001_motionless_wind_dancer.sql`

| Linha | Avaliação |
|:------|:----------|
| 2-3 | `COLLATE utf8mb4_bin` em `event_id` e `aggregate_id` de `ctr_outbox`. PASS. |
| 16 | `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` em `ctr_outbox`. PASS. |
| 19-20 | `COLLATE utf8mb4_bin` em `event_id` e `aggregate_id` de `ctr_outbox_dead_letter`. PASS. |
| 32 | `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` em `ctr_outbox_dead_letter`. PASS. |
| 36 | `COLLATE utf8mb4_bin` em `event_id` de `eventos_processados`. PASS. |
| 39 | `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` em `eventos_processados`. PASS. |
| 41-44 | 4 índices criados fora das DDL via `CREATE INDEX` — determinístico, sem dependência de ordem. PASS. |
| Geral | Migration determinística: mesmo SQL em re-runs (sem DDL condicional desnecessário). PASS. |

### `tests/modules/contracts/adapters/persistence/outbox-schema.test.ts`

| Linha | Avaliação |
|:------|:----------|
| 31 | Guard `MYSQL_INTEGRATION=1` — alinhado com padrão do repo. PASS. |
| 44-48 | `truncateOutbox` via DELETE (não TRUNCATE) — compatível com `FOREIGN_KEY_CHECKS` mesmo sem FK. Correto. |
| 55-80 | `isCheckConstraintError` — narrowing explícito, cobre `err.cause` (wrapping Drizzle), `errno: 3819`, `code: 'ER_CHECK_CONSTRAINT_VIOLATED'`. Robusto. PASS. |
| 139 | `as unknown as unknown[]` com comentário justificado — padrão canônico do projeto. PASS. |
| 241-251 | EXPLAIN: narrowing `typeof rawPk === 'string'` antes de `.includes()` — cumpre `@typescript-eslint/no-base-to-string`. PASS. |
| 5 testes | CA6-T1 (INSERT+SELECT), CA6-T2 (CHECK attempts), CA6-T3 (CHECK aggregate_type), CA6-T4 (EXPLAIN index), CA6-T5 (DLQ CHECK). Todos os CAs do `000-request.md` cobertos. PASS. |

---

## Observações (não-bloqueantes)

1. **DLQ sem `attempts_nonneg_chk`** (linhas 271-279): a DLQ recebe apenas eventos que atingiram `MAX_ATTEMPTS`, portanto `attempts >= 1` seria mais preciso. No entanto, dado que o worker (ticket #5) controlará a inserção na DLQ, a constraint de domínio pode ser aplicada lá sem forçar noise no schema agora. Aceitável para ticket #1.

2. **`payload VARCHAR(8192)`**: limite atual cobre eventos do domínio com folga (maior ≈ 500 bytes). Revisitar quando o worker (ticket #5) estiver implementado e payload médio for mensurável em produção.

3. **Comentário de responsabilidade do próximo dev** (linhas 32-36 do schema): explícito e correto — CHARSET/COLLATE precisa ser aplicado manualmente em migrations futuras. O `schema-hardening.test.ts` deve ser estendido para cobrir `0001_*.sql` em tickets futuros.

---

## Resumo

Todos os CAs do `000-request.md` atendidos. Nenhuma violação de ADR detectada. A implementação é mínima, mecânica e precisa — exatamente o esperado para ticket #1 de schema puro.

**APPROVED — pode avançar para W3.**
