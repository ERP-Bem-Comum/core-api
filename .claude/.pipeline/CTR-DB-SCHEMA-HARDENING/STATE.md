# Estado do Ticket CTR-DB-SCHEMA-HARDENING

> M1 (charset/collate) + M3 (.for('update')) + M6 (limpar comentário SQLite) + L2 (rename FK longo).
> Origem: audit `handbook/reviews/0002-...` §M1, §M3, §M6, §L2.
> Orquestração: `.claude/skills/pipeline-maestro/SKILL.md` (W0→W3).

## ⚠️ Skills obrigatórias

- 📚 [`database-theorist`](../../skills/database-theorist/SKILL.md)
- 🔧 [`database-engineer`](../../skills/database-engineer/SKILL.md)
- 🚦 [`pipeline-maestro`](../../skills/pipeline-maestro/SKILL.md)

## Waves

| Wave | Status | Skill | REPORT |
| :--- | :--- | :--- | :--- |
| W0 — RED (guards estruturais) | ✅ completed | database-engineer | [002-tests/REPORT.md](./002-tests/REPORT.md) |
| W1 — GREEN (charset/collate + FOR UPDATE + comentário + FK rename) | ✅ completed | database-engineer | [003-impl/REPORT.md](./003-impl/REPORT.md) |
| W2 — REVIEW | ✅ completed (APPROVED) | code-reviewer | [004-code-review/REVIEW.md](./004-code-review/REVIEW.md) |
| W3 — QUALITY | ✅ completed | ts-quality-checker | [005-quality/REPORT.md](./005-quality/REPORT.md) |

## Status final

- 2026-05-18: ticket aberto e concluído na mesma sessão dos 3 anteriores. **Toda a sequência §3 do audit `0002` está fechada.**
- **M1 endereçado**: 3 CREATE TABLE com `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` + UUIDs em `utf8mb4_bin`.
- **M3 endereçado**: `.for('update')` no SELECT pré-upsert dos 2 repos drizzle.
- **M6 endereçado**: comentário SQLite removido do `money.mapper.ts`.
- **L2 endereçado**: FK renomeada `ctr_amendments_contract_id_ctr_contracts_id_fk` → `ctr_amend_contract_fk` (47 → 21 chars) em SQL + snapshot + schema TS.
- Testes: +10 guards estruturais (CA-15..CA-23). Suítes contratuais inalteradas e verdes.
- Gates W3: typecheck ✅ · format:check ✅ · test 451/0/13 ✅ · lint ✅.

## Decisão importante

ADR-0014 fixa `utf8mb4_unicode_ci` — **vence o audit** (que sugere `utf8mb4_0900_ai_ci`). Aplicamos por tabela alinhado ao server-level.

## Dívida residual documentada (não-bloqueante)

- `drizzle-orm@0.45.x` não expõe `charset`/`collate` table-level — comentário forte no `schemas/mysql.ts` alerta dev futuro a replicar manualmente em qualquer migration `0001+`.
- Sugestão de inquiry: `handbook/inquiries/charset-drizzle-roadmap.md` quando drizzle suportar.

## Sequência completa do audit `0002` §3 — FECHADA

1. ✅ `CTR-DB-MAPPER-NO-THROW`
2. ✅ `CTR-DB-DRIVER-POOL-TUNING`
3. ✅ `CTR-DB-REPO-LIST-N1`
4. ✅ `CTR-DB-SCHEMA-HARDENING` ← este
