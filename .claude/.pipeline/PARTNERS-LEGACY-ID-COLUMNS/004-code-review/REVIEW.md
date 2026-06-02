# W2 — REVIEW — PARTNERS-LEGACY-ID-COLUMNS

**Skill:** code-reviewer · **Round:** 1 · **Veredito: APPROVED**

## Escopo auditado

- `src/modules/partners/adapters/persistence/schemas/mysql.ts` (coluna + índice × 4)
- `src/modules/partners/adapters/persistence/migrations/mysql/0004_secret_wendell_vaughn.sql` (gerado)
- `tests/modules/partners/adapters/persistence/legacy-id-columns.test.ts` (W0)

## Conformidade

| Regra | Status |
| :--- | :--- |
| ADR-0020 — `int` permitido; `legacy_id` é correlação, **não** PK de domínio (sem AUTO_INCREMENT em PK) | ✅ |
| ADR-0020 — sem JSON/ENUM/feature proibida | ✅ |
| ADR-0014 — isolamento `par_*` preservado; sem FK cross-módulo | ✅ |
| Convenção de nome de índice — segue o padrão **real** do arquivo (`par_<tabela>_<coluna>_idx`, ex. `par_financiers_cnpj_idx`) | ✅ |
| Idioma — código EN (`legacyId`/`legacy_id`), comentários PT | ✅ |
| Migration gerada via `db:generate:partners`, não editada à mão (`int` dispensa CHARSET/COLLATE manual) | ✅ |
| Nullable correto — UNIQUE com múltiplos NULL (InnoDB) permite registros nativos | ✅ |
| Mappers intactos — `$inferInsert` ganha campo opcional; registros nativos ficam com `legacy_id` NULL | ✅ (238/238 regressão verde) |

## Observações (não-bloqueantes)

- 🔵 O header do schema menciona convenção `par_<abreviação>_<coluna>_idx`, mas a prática consolidada no arquivo usa o **nome completo da tabela** (`par_suppliers_cnpj_idx`). O ticket seguiu a prática real (consistência com o código existente vence o comentário). Dívida de doc do header — fora do escopo deste ticket.

## Veredito

**APPROVED** (round 1). Mudança mínima, idiomática, sem regressão. Nada a corrigir.
