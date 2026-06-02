# W1 — GREEN · PARTNERS-COLLABORATOR-LIST-FILTERS

**Skill:** application-cli-builder (query) · **Resultado:** GREEN (filtro 14/14; suíte partners 180/180)

## Arquivo editado

`src/modules/partners/application/use-cases/list-collaborators.ts` (reescrito):
- **`CollaboratorListFilter`** — `search?`, `statuses?`, `registrationStatuses?`, `occupationAreas?`,
  `employmentRelationships?` (todos opcionais, tipos de união do domínio).
- **`collaboratorMatchesFilter(c, filter)`** — predicado puro exportado. Helpers `matchesSearch`
  (name substring ci OU cpf por dígitos) e `matchesIn<T>` (array ausente/vazio = não restringe).
- **`listCollaborators`** estendido — `(deps) => (filter = {}) => ...`. `repo.list()` → propaga erro →
  `ok(items.filter(...))`. Chamada `()` retorna todos (compat. preservada).

## Decisões de design

- **Filtro na application** (não no port) — predicado puro sobre `repo.list()`; Drizzle/InMemory/domínio
  **intocados**. ADR-0031 sanciona varredura; gate default cobre sem integração. Migração para WHERE é
  follow-up quando houver volume (assinatura já pronta).
- **`matchesIn<T>` genérico** — array `undefined`/vazio não restringe; senão `includes`. Reaproveitado
  pelos 4 filtros de enum. Semântica AND-entre-campos / OR-dentro-do-array.
- **`search` tolerante** — `cpf` casa por dígitos do termo (ignora máscara); `name` case-insensitive.
- **Default `filter = {}`** preserva a chamada existente `listCollaborators(deps)()` (teste de usecases).

## Confirmação GREEN

```
filtro:           ℹ tests 14  · pass 14  · fail 0
suíte partners:   ℹ tests 180 · pass 180 · fail 0
```
