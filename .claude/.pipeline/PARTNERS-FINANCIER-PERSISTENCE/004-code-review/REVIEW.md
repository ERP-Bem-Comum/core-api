# W2 — REVIEW · PARTNERS-FINANCIER-PERSISTENCE

> Agente: code-reviewer · Round: 1 · Veredito: **APPROVED**

## Checklist

| Critério | Status | Nota |
| :--- | :--- | :--- |
| ADR-0020 (sem ENUM/JSON/ODKU/AUTO_INCREMENT; UUID; datetime(3)) | ✅ | `save` é SELECT-then-UPDATE-or-INSERT |
| ADR-0014 (prefixo `par_*`, migrationsTable próprio) | ✅ | `__drizzle_migrations_partners` |
| CHARSET/COLLATE manual na migration | ✅ | ENGINE + `utf8mb4_bin` em id/cnpj |
| Boundary: zero throw cruza a borda | ✅ | try/catch → Result em todo método do repo |
| Mapper row↔domínio + reidratação encapsulada | ✅ | `Financier.rehydrate` valida coerência de estado |
| Port respeitado (FinancierRepository) | ✅ | findById/findByCnpj/list/save |
| CHECK de consistência active↔deactivated_at | ✅ | defesa em profundidade no schema |
| Teste de integração gated + documentado | ✅ | `test:integration:partners`; gap de invocação manual |

## Análise pontual

- **Validação real** (não só typecheck): a suíte de integração rodou contra MySQL 8.4 e o caso
  `financier-cnpj-duplicate` confirma que o UNIQUE + a detecção de ER_DUP_ENTRY (errno 1062 +
  `par_financiers_cnpj_idx` no sqlMessage) funcionam de ponta a ponta — não é falso-verde.
- **UPDATE preserva `created_at`** (destructuring remove do set) — semântica de upsert correta.
- **`migrationsTable` isolado** evita o bug de journal compartilhado entre módulos no DB `core`.
- **Mapper error → `financier-repo-unavailable`** em leitura: pragmático dado o port fechado; logado
  no stderr para diagnóstico (dado corrompido é evento raro de infra).

## Issues

Nenhuma. Liberado para W3.
