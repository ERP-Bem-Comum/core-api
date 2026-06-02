# W2 — REVIEW — PARTNERS-CONTRACTOR-READ-PORT

**Skill:** code-reviewer (read-only). **Round:** 1.

## Veredito: APPROVED

## Audit log
- pnpm run lint → 0 erros / 0 warnings (eslint . — typescript-eslint strict + type-checked).
- grep .insert/.update/.delete/provision/save no read adapter → NENHUM (único hit é a palavra
  "ETL" num comentário). Read-only confirmado (CA2).
- git status src/modules/partners/domain/ → vazio. Domínio puro INTOCADO.
- Arquivos alterados = exatamente os 5 esperados + tests + package.json + STATE.

## Checagem por invariante
| Invariante | Status | Evidência |
| :--- | :--- | :--- |
| ADR-0006 (cross-módulo só via public-api) | OK | index.ts re-exporta buildPartnersReadPort + tipos; port referencia *View (projeção), não agregado |
| ADR-0014 (nada de par_* cru) | OK | adapter SELECTs par_* mas devolve *View; bank/PIX vêm do VO de domínio reconstruído, não de coluna crua |
| CA2 só leitura | OK | só db.select(); applyMigrations:false |
| CA3 Result / sem throw | OK | try/catch → err('contractor-read-unavailable') em todo método; mapper-error → err |
| CA1 id inexistente → ok(null) | OK | row===undefined → ok(null) nas 3 views |
| import type / verbatimModuleSyntax | OK | typecheck + lint verdes |
| Domínio puro intocado | OK | git status domain/ vazio |

## Notas (não-bloqueantes)
- `as unknown as string` para desbrandar id/cnpj/cpf segue o padrão já usado nos repos Drizzle do módulo (supplier-repository.drizzle.ts) — consistente.
- Reuso de *FromRow (em vez de findById) é a escolha certa: findById descarta updatedAt; o read precisa do row.updated_at.

## Próximo passo (W3 QUALITY)
Gate final: typecheck + lint + format:check + pnpm test verdes.
