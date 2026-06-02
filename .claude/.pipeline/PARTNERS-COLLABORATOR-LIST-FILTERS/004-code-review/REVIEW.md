# W2 — REVIEW · PARTNERS-COLLABORATOR-LIST-FILTERS

**Skill:** code-reviewer · **Round:** 1 · **Veredito:** ✅ APPROVED

## Escopo auditado (read-only)

- `src/modules/partners/application/use-cases/list-collaborators.ts`
- `tests/modules/partners/application/collaborator-list-filter.test.ts`

## Aderência (`.claude/rules/application.md`)

- ✅ **Query na application** — filtro é leitura, não estado de negócio nem invariante; lugar correto.
  Não há `if` decidindo estado de domínio (apenas pertencimento/substring).
- ✅ **Sem import de `adapters/`** — só tipos de port e do domínio.
- ✅ **Predicado puro** `collaboratorMatchesFilter` — determinístico, sem IO/Clock, exportado e testado
  isolado. `matchesIn<T>` genérico, reusado.
- ✅ **Use case factory** `(deps) => (filter?) => Promise<Result<...>>`; propaga erro do `repo.list()`
  antes de filtrar. Eventos: N/A (query).
- ✅ **Compat preservada** — default `filter = {}` mantém `listCollaborators(deps)()` (teste de usecases verde).
- ✅ **Idioma** EN; tipos de união do domínio (`OccupationArea`/`EmploymentRelationship`/`RegistrationStatus`).

## Observações (não-bloqueantes)

1. **Filtro na application vs. WHERE no repo** — trade-off explícito no cabeçalho e no `000-request.md`.
   Correto por ADR-0031 (cardinalidade modesta) + cobertura no gate default. A assinatura de
   `CollaboratorListFilter` deixa a migração para SQL pronta sem quebrar chamadores.
2. **`search` em `cpf` por dígitos** — termo `'111.444'` casa via `replace(/\D/g,'')`. Coerente com o VO
   (11 dígitos sem máscara). `name` case-insensitive. Sem normalização de acento — aceitável (YAGNI;
   busca exata de substring; adicionar `localeCompare`/fold se virar requisito).
3. **`statuses?: readonly Collaborator['status'][]`** — indexed access mantém a fonte única do union
   ('Active'|'Inactive') sem redeclarar. Bom.

## Conclusão

Estabelece um padrão de filtro limpo e extensível, ADR-compliant, sem scope creep. **APPROVED** — segue para W3.
