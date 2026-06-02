# W1 — GREEN · PARTNERS-COLLABORATOR-USECASES

**Skill:** ports-and-adapters · **Resultado:** GREEN (19/19)

## Arquivos criados

**Port (domain)**
- `src/modules/partners/domain/collaborator/repository.ts` — `CollaboratorRepository`
  (`findById`/`findByCpf`/`findByEmail`/`list`/`save`). Erros: `collaborator-repo-unavailable`,
  `collaborator-cpf-duplicate`, `collaborator-email-duplicate`. Posicionado no domínio (unicidade é
  invariante do agregado), espelha `SupplierRepository` + 2ª unicidade.

**Adapter (adapters)**
- `adapters/persistence/repos/collaborator-repository.in-memory.ts` — `makeInMemoryCollaboratorStore`.
  `save` varre o `Map` e recusa CPF/email duplicados com id distinto.

**Use cases (application, curried `(deps) => (cmd)`)**
- `register-collaborator.ts` — gera id, `clock.now()`, `Collaborator.register`, guard CPF (`findByCpf`)
  **e** email (`findByEmail`) com os valores já normalizados pelo domínio, `save`.
- `complete-collaborator-registration.ts` — `rehydrate` id → `findById` → `Collaborator.completeRegistration` → `save`.
  Comando = `{ collaboratorId } & CompleteRegistrationInput` (destructuring do rest passa direto ao domínio).
- `deactivate-collaborator.ts` — `findById` → `Collaborator.deactivate(disableBy, now)` → `save`.
- `reactivate-collaborator.ts` — simétrico (`Collaborator.reactivate`).
- `list-collaborators.ts` (query) — `repo.list()`.
- `find-collaborator-by-cpf.ts` (query) — `Cpf.parse` → `repo.findByCpf`.

## Decisões de design (mínimo p/ GREEN)

- **Duas unicidades sequenciais** no `register`: CPF antes de email (ordem determina qual erro vem
  primeiro num registro que viola ambas). Coerente com o InMemory (mesma ordem na varredura).
- **`startOfContract: Date`** no comando do register — conversão `string → Date` é responsabilidade do
  adapter HTTP/CLI futuro; o use case recebe `Date` já tipado (domínio espera `Date`).
- **`completeRegistration` sem fluxo público** (check dos 3 primeiros dígitos do CPF) — fora de escopo
  (ticket HTTP/CLI). Aqui é só a transição de estado sobre o agregado.
- **Erros `*-invalid-id`** adicionados por simetria com supplier (`rehydrate` de id falho), embora os
  testes só cubram not-found/duplicate/domínio — YAGNI mantido (a superfície espelha o precedente).

## Confirmação GREEN

```
ℹ tests 19
ℹ pass 19
ℹ fail 0
```
