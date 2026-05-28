# Code Review — CORE-HTTP-SHELL-RELOCATE — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-05-28
**Escopo revisado:** `src/shared/http/{app,config,errors,reply}.ts`, `src/server.ts`,
`tests/shared/http/bootstrap.test.ts`, `eslint.config.js` (bloco de borda HTTP), `handbook/architecture/adr/0028-*.md`

---

## Natureza

Refactor de **movimentação** (ADR-0028). Nenhuma lógica de negócio tocada — só localização e path de import.
Critério dominante: **comportamento preservado** (CA1).

## Verificação por categoria (checklist code-reviewer)

| Cat. | Item | Resultado |
| :-- | :-- | :-- |
| E (Modular Monolith) | Shell transversal em `src/shared/http/`; composition root `src/server.ts` importa **só** de `#src/shared/http/*` + `#src/shared/*`; nenhum módulo importado | ✅ adere ADR-0028 / ADR-0006:53-63 |
| E | Nenhum `#src/http/` remanescente (`grep` vazio em `src/` e `tests/`) | ✅ CA2 |
| F (ESM/NodeNext) | Imports com extensão `.ts`; `import type` preservado; subpath `#src/*` | ✅ inalterado do H0 |
| H (Tests) | 7 asserções **idênticas** ao H0; AAA preservado; `app.inject` + fakes; sem matcher vago | ✅ CA1 |
| Borda (ADR-0025) | `src/shared/http/` recebe as folgas de adapter no ESLint; `src/modules/*/adapters/http/**` já incluído (prepara plugin-export) | ✅ |
| ADR-0027 | Zod permanece só na borda (`src/shared/http/`); domínio/application intocados | ✅ |

## Evidência (do W1 + gate)

- `grep -rn "#src/http/" src/ tests/` → vazio (CA2).
- `node --test tests/shared/http/bootstrap.test.ts` → 7/7 pass (CA1).
- `tsc --noEmit` → zero erros (CA3 — referências resolvem).
- `eslint .` → limpo; `src/server.ts` (fora do glob de folgas) **não** acusou — não precisava das relaxações (CA4).

## O que está bom

- Blast radius respeitado: a movimentação não vazou para nenhum módulo nem script.
- O cabeçalho do teste foi atualizado para a nova home (sem deixar menção transitória ao path antigo) — diff limpo.
- ADR-0028 deixa a decisão normativa e citável; CHANGELOG + índice de ADRs atualizados.

## Issues

Nenhuma 🔴 / 🟡 / 🔵.

## Próximo passo

APPROVED → W3 (gate de qualidade). Gate já executado no W1 com tudo verde; W3 formaliza.
