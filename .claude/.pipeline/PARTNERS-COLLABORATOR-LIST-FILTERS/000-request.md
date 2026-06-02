# PARTNERS-COLLABORATOR-LIST-FILTERS — Listagem multifiltro + busca nameOrCPF

> **Size:** M · **ADR:** [ADR-0031](../../../handbook/architecture/adr/0031-partners-registry-module.md) · **Épico:** `.claude/.planning/EPIC-PARTNERS-CADASTROS.md` (Fase 4)
> **Legado:** `GET /collaborators` (openapi.yaml:101-159) — `search`, `active`, `status[]`, `occupationAreas[]`, `employmentRelationships[]`, etc. Skill: `application-cli-builder` (query).

## Contexto

A query `listCollaborators` hoje é MVP (sem filtros — `list-collaborators.ts:14`). O legado expõe
listagem multifiltro com **busca textual nameOrCPF** + filtros por enums. Este ticket adiciona
**filtragem na camada de aplicação** sobre a coleção retornada por `repo.list()`.

### Decisão de design (não havia precedente no projeto)

- **Filtro na application, não no port** — o predicado puro `collaboratorMatchesFilter(c, filter)` é
  aplicado sobre `repo.list()`. **Não mexe no Drizzle** (WHERE dinâmico só validaria sob integração) nem
  no InMemory. Justificativa: ADR-0031 sanciona varredura (cardinalidade modesta); YAGNI; testável no
  gate default. **Trade-off documentado**: quando houver volume, migrar para WHERE no repositório (a
  assinatura do filtro já fica pronta para isso).
- **Semântica**: AND entre campos diferentes; OR dentro de cada array; campo ausente/array vazio = não restringe.

## Escopo (`src/modules/partners/application/use-cases/list-collaborators.ts`)

1. **Tipo `CollaboratorListFilter`** (todos os campos opcionais):
   - `search?: string` — substring case-insensitive em `name` **OU** dígitos em `cpf` (ignora máscara).
   - `statuses?: readonly ('Active' | 'Inactive')[]` — soft-delete.
   - `registrationStatuses?: readonly RegistrationStatus[]` — PreRegistration/Complete.
   - `occupationAreas?: readonly OccupationArea[]`.
   - `employmentRelationships?: readonly EmploymentRelationship[]`.
2. **Predicado puro** `collaboratorMatchesFilter(c, filter): boolean` — exportado, testável isolado.
   - `search`: `name.toLowerCase().includes(q)` OR (`q` tem dígitos E `cpf.includes(digits)`).
   - arrays: `field ∈ array` quando o array é não-vazio.
3. **Use case** `listCollaborators` estendido — curried `(deps) => (filter?) => Promise<Result<readonly Collaborator[], E>>`.
   `repo.list()` → propaga erro → `ok(items.filter(c => collaboratorMatchesFilter(c, filter)))`.
   Chamada sem argumento (`()`) continua retornando todos (compat. com o teste existente).

## Fora de escopo

- **Paginação** (`page`/`limit`) e **ordenação** (`order`) — sem consumidor HTTP ainda (YAGNI).
- **`/collaborators/options`** (dropdowns) — endpoint de metadados, ticket próprio.
- Filtros legados adicionais (`age`, `yearOfContract`, `genderIdentities[]`, `breeds[]`, `educations[]`,
  `disableBy[]`, `roles[]`) — o padrão fica pronto; adicionar quando o consumidor real existir.
- WHERE no Drizzle/SQL; CLI/HTTP; mudança no port/InMemory/domínio.

## Critérios de aceite

- [ ] `collaboratorMatchesFilter(c, {})` → `true` (filtro vazio não restringe).
- [ ] `search` por nome (substring case-insensitive) inclui/exclui corretamente.
- [ ] `search` por CPF com e sem máscara (só dígitos) casa o colaborador; texto que não bate nome nem CPF → exclui.
- [ ] `statuses=['Active']` exclui Inactive; `registrationStatuses=['Complete']` exclui PreRegistration.
- [ ] `occupationAreas=['DDI']` exclui PARC; `employmentRelationships=['PJ']` exclui CLT.
- [ ] AND entre campos: `search` casa o nome mas `statuses` não inclui o status → exclui.
- [ ] Array vazio em qualquer campo = não restringe.
- [ ] `listCollaborators(deps)(filter)` via InMemory retorna só os que casam; `()` retorna todos.
- [ ] W3 verde: typecheck + format:check + test + lint.

## Notas de disciplina

- W0 RED antes de `src/`. Predicado **puro** (sem IO/Clock). Filtro é query (não muta estado, não é
  invariante de domínio) — vive na application.
- Tipos de união do domínio no filtro; o parse de strings cruas fica na borda HTTP/CLI futura.
- Código EN; reusa `OccupationArea`/`EmploymentRelationship`/`RegistrationStatus` do domínio.
