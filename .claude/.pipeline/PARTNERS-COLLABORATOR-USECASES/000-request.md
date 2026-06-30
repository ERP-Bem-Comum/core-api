# PARTNERS-COLLABORATOR-USECASES — Port + InMemory + use cases do `Collaborator`

> **Size:** M · **ADR:** [ADR-0031](../../../handbook/architecture/adr/0031-partners-registry-module.md) · **Épico:** `.claude/.planning/EPIC-PARTNERS-CADASTROS.md` (Fase 4)
> **Espelha:** `PARTNERS-SUPPLIER-USECASES` / `PARTNERS-FINANCIER-USECASES` (port + InMemory + use cases curried `(deps) => (cmd)`). Skill: `ports-and-adapters`.

## Contexto

Camada de aplicação do agregado `Collaborator` (domínio entregue em `PARTNERS-COLLABORATOR-DOMAIN`:
`register`/`completeRegistration`/`deactivate`/`reactivate`/`rehydrate` já existem). Usa **adapter
InMemory** (padrão `application-cli-builder` — valida regra antes de DB real). O adapter Drizzle /
tabela `par_collaborators` vem em ticket próprio (`PARTNERS-COLLABORATOR-PERSISTENCE`).

**Duas unicidades** (vs. a única de supplier/financier): legado `collaborators` tem `cpf` UNIQUE **e**
`email` UNIQUE — ambas entram na superfície do port. (RG é nullable e só preenchido em
`completeRegistration`; sua unicidade fica para o ticket de persistência/complete, fora daqui.)

## Escopo

1. **Port** `src/modules/partners/domain/collaborator/repository.ts` — `CollaboratorRepository`:
   `findById`, `findByCpf`, `findByEmail`, `list`, `save`. Erros `CollaboratorRepositoryError`:
   `'collaborator-repo-unavailable'` (transient), `'collaborator-cpf-duplicate'`,
   `'collaborator-email-duplicate'`. Sem outbox nesta fase (YAGNI, igual supplier/financier).
2. **Adapter InMemory** `src/modules/partners/adapters/persistence/repos/collaborator-repository.in-memory.ts`
   — `Map<CollaboratorId, Collaborator>`; `save` recusa CPF **e** email duplicados com id diferente
   (`'collaborator-cpf-duplicate'` / `'collaborator-email-duplicate'`). `findByCpf`/`findByEmail` por
   varredura (cardinalidade modesta — ADR-0031).
3. **Use cases** `src/modules/partners/application/use-cases/` (curried `(deps) => (cmd)`):
   - `register-collaborator.ts` — Deps `{ collaboratorRepo, clock }`. Gera id, `clock.now()`,
     `Collaborator.register`, guard de CPF duplicado (`findByCpf`) **e** email duplicado (`findByEmail`)
     antes do `save`. Retorna `{ collaborator (Active/PreRegistration), event CollaboratorRegistered }`.
     Erros de domínio propagados (cpf/email/occupationArea/employmentRelationship inválidos).
   - `complete-collaborator-registration.ts` — `CollaboratorId.rehydrate(id)` → `findById` (not-found)
     → `Collaborator.completeRegistration(c, input, now)` → `save`. Guard de Complete vem do domínio
     (`collaborator-already-complete`). **Sem** o fluxo público / check-first-three-numbers-cpf (fica
     no ticket HTTP/CLI futuro — D3).
   - `deactivate-collaborator.ts` — rehydrate id → `findById` (not-found) → `Collaborator.deactivate(disableBy, now)` → `save`.
   - `reactivate-collaborator.ts` — simétrico (`Collaborator.reactivate(now)`); já ativo → `collaborator-already-active`.
   - `list-collaborators.ts` (query) — `repo.list()`.
   - `find-collaborator-by-cpf.ts` (query) — `Cpf.parse` → `repo.findByCpf`; `null` quando ausente.

## Fora de escopo

- Adapter Drizzle / tabela `par_collaborators` / migração / integração MySQL (`PARTNERS-COLLABORATOR-PERSISTENCE`).
- CLI, public-api (eventos/read model), `collaborator_history` projection, `/users` profile, bulk import.
- Fluxo público de auto-cadastro (check dos 3 primeiros dígitos do CPF), filtros de listagem, CSV.

## Critérios de aceite

- [ ] `registerCollaborator` com dados válidos persiste e retorna `{ collaborator (Active+PreRegistration), event CollaboratorRegistered }`.
- [ ] 2º registro com mesmo CPF → `'register-collaborator-cpf-duplicate'`; mesmo email → `'register-collaborator-email-duplicate'`.
- [ ] `registerCollaborator` propaga erros de domínio: CPF inválido → `'invalid-cpf'`; email inválido → `'collaborator-email-invalid'`; occupationArea/employmentRelationship desconhecidos → erro do enum.
- [ ] `completeCollaboratorRegistration` id inexistente → `'complete-collaborator-registration-not-found'`; em PreRegistration → Complete persistido + `CollaboratorRegistrationCompleted`; em Complete → `'collaborator-already-complete'`.
- [ ] `deactivateCollaborator` id inexistente → `'deactivate-collaborator-not-found'`; existente → Inactive (com `disableBy`+`deactivatedAt`) persistido; já inativo → `'collaborator-already-inactive'`.
- [ ] `reactivateCollaborator` reativa um inativo; já ativo → `'collaborator-already-active'`.
- [ ] `listCollaborators` retorna os persistidos; `findCollaboratorByCpf` acha por CPF e retorna `null` quando ausente.
- [ ] Adapter InMemory recusa CPF e email duplicados (id distinto) com o erro correto.
- [ ] W3 verde: typecheck + format:check + test + lint.

## Notas de disciplina

- W0 RED antes de tocar `src/`. Tempo injetado via `Clock` port (fake clock no teste).
- Use case faz `rehydrate`/`parse` das strings cruas na borda; erros kebab EN; curried `(deps) => (cmd)`.
- Reusa VO `Cpf` do kernel; `Collaborator.*` via `import * as Collaborator from '../../domain/collaborator/collaborator.ts'`.
- Port vive em `domain/collaborator/` (unicidade é invariante do agregado, espelha supplier/financier).
