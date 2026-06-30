# W2 — REVIEW — CTR-PERMISSION-CATALOG

**Skill:** code-reviewer · **Round:** 1 · **Veredito: APPROVED**

## Escopo auditado

- `src/modules/contracts/public-api/permissions.ts` (novo)
- `src/modules/contracts/public-api/index.ts` (re-export)
- `src/modules/contracts/adapters/http/plugin.ts` (refactor 13 call-sites)
- `tests/modules/contracts/public-api/permissions.test.ts` (W0)

## Conformidade

| Regra | Status |
| :--- | :--- |
| ADR-0006 — catálogo em `public-api`; outros módulos importam só daqui | ✅ |
| ADR-0006 — `plugin.ts` (mesmo módulo) importa de `../../public-api/permissions.ts` | ✅ |
| Idioma — código EN, comentários PT | ✅ |
| TS strict — `const` object + union derivada `[keyof typeof]`; sem `as` cego; branded `Permission` da borda intacto | ✅ |
| `verbatimModuleSyntax` — `export type { ContractPermission }` separado do valor | ✅ |
| Sem magic string de permission no `plugin.ts` | ✅ (13 call-sites migrados) |
| Sem regressão | ✅ (97/97 rotas de contracts verdes) |

## Observações

- 🟢 `const` object dá acesso nomeado (autocomplete) + `Object.values()` para iteração futura, sem duplicar SSoT. Decisão alinhada à síntese dos especialistas.
- 🔵 `contract:mass-approve` ainda não é usado por nenhuma rota de contracts (declarado para a concessão pela ETL) — esperado; o catálogo declara, o grant acontece no ETL.

## Veredito

**APPROVED** (round 1). Mínimo, idiomático, ADR-0006-correto, sem regressão.
