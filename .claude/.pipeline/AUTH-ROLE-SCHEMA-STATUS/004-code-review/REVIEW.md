# W2 — Code Review (read-only) · AUTH-ROLE-SCHEMA-STATUS

**Agente:** code-reviewer · **Veredito:** APPROVED ✅ (round 1)

## Checklist

| Critério | Status |
| --- | --- |
| ADR-0020 — VARCHAR+CHECK, sem ENUM nativo | ✅ `varchar(16)` + `auth_role_status_chk` |
| Migration **gerada** (nunca SQL à mão) | ✅ `db:generate:auth` → `0006_outstanding_xavin.sql` |
| Incremental, não-destrutiva; default p/ linhas existentes | ✅ `ADD ... DEFAULT 'active' NOT NULL` |
| Coerência com padrão `auth_user.status` | ✅ espelhado fielmente |
| CHECK nomeado (convenção `_chk`) | ✅ |
| Unicidade/índices preservados | ✅ `auth_role_name_idx` intacto |
| Validação real (não só estática) | ✅ integração MySQL 38/38 |
| Escopo: DDL apenas; seed deferido a T048 | ✅ explícito no 000-request |

## Observações

- `db:generate:auth` (config separada) é a armadilha do ticket — bem registrada no REPORT W1 para os próximos schema-tickets do auth.
- `status` ainda sem uso no domínio — correto: `archive()` e mapeamento row↔domínio vêm em `AUTH-ROLE-LIFECYCLE-AGG` (T008/T011).

Sem issues. Aprovado para W3.
