# PARTNERS-COLLABORATOR-COMPLETE-REGISTRATION — Fluxo público de auto-cadastro (check dos 3 dígitos do CPF)

> **Size:** M · **ADR:** [ADR-0031](../../../handbook/architecture/adr/0031-partners-registry-module.md) · **Épico:** `.claude/.planning/EPIC-PARTNERS-CADASTROS.md` (Fase 4, linha 95)
> **Legado:** `GET /collaborators/{id}/check-first-three-numbers-cpf/{cpf}` (openapi.yaml:252-268, `security: []`) + `POST /collaborators/{id}/complete-registration` (openapi.yaml:232-250, `security: []`). Skill: `application-cli-builder`.

## Contexto

O colaborador é pré-cadastrado pelo admin e **completa o próprio cadastro via fluxo público** (sem
login — `handbook/domain/11-parceiros-cadastros-context.md:77`). A verificação leve de identidade são
**os 3 primeiros dígitos do CPF**: o colaborador informa o prefixo, o sistema confere contra o CPF
armazenado e libera os dados para edição.

O use case `completeCollaboratorRegistration` (admin/interno) já existe (`PARTNERS-COLLABORATOR-USECASES`).
Este ticket adiciona a peça do **fluxo público**: o gate dos 3 dígitos + um complete público que
**revalida o prefixo** antes de transicionar.

### Decisão de segurança (diverge do legado)

No legado, o `POST /complete-registration` é público e **não revalida** o CPF (confia que o GET foi
chamado antes) — IDOR latente: qualquer um com o `{id}` completa o cadastro. Aqui o complete público
**re-exige o prefixo do CPF** (defense-in-depth). Sem borda HTTP nesta fase (Fase 2+ exige ADR Fastify);
entregamos os **use cases de aplicação**, reusáveis por uma futura rota.

## Escopo (`src/modules/partners/application/use-cases/`)

1. **Helper puro** `verify-cpf-prefix.ts` — `verifyCpfPrefix(cpf, prefixRaw): Result<true, CpfPrefixError>`:
   normaliza o prefixo (só dígitos), exige exatamente 3, compara com `String(cpf).slice(0,3)`.
   Erros `CpfPrefixError`: `'cpf-prefix-invalid'` (não são 3 dígitos), `'cpf-prefix-mismatch'` (não bate).
2. **`check-first-three-numbers-cpf.ts`** (query — passo 1):
   - cmd `{ collaboratorId: string; cpfPrefix: string }`; Deps `{ collaboratorRepo }`.
   - rehydrate id → `findById` (not-found) → `verifyCpfPrefix` → retorna o `Collaborator` (para o form).
   - Erros: `'check-cpf-invalid-id'`, `'check-cpf-not-found'`, `CpfPrefixError`, `CollaboratorRepositoryError`.
3. **`complete-collaborator-registration-public.ts`** (passo 2 seguro):
   - cmd `{ collaboratorId: string; cpfPrefix: string } & CompleteRegistrationInput`; Deps `{ collaboratorRepo, clock }`.
   - rehydrate id → `findById` (not-found) → `verifyCpfPrefix` → `Collaborator.completeRegistration(c, input, now)` → `save`.
   - Erros: `'public-complete-invalid-id'`, `'public-complete-not-found'`, `CpfPrefixError`, `CollaboratorError`, `CollaboratorRepositoryError`.
   - Guard de já-completo (`collaborator-already-complete`) vem do domínio.

## Fora de escopo

- Borda HTTP/CLI das rotas públicas (Fase 2+, ADR Fastify); envio de e-mail com o link.
- D3 (campos obrigatórios do "CADASTRO_COMPLETO") — segue all-optional; quando o P.O. declarar, vira guard no domínio.
- Mudança no `completeCollaboratorRegistration` admin (coexiste); mudança no domínio/persistência.

## Critérios de aceite

- [ ] `verifyCpfPrefix`: prefixo `'111'` casa CPF `111…`; `'11'`/`'1111'`/`'ab1'` → `cpf-prefix-invalid`; `'999'` → `cpf-prefix-mismatch`; aceita máscara (`'111.'` → 3 dígitos).
- [ ] `checkFirstThreeNumbersCpf`: id inexistente → `check-cpf-not-found`; prefixo errado → `cpf-prefix-mismatch`; prefixo certo → retorna o `Collaborator`.
- [ ] `completeCollaboratorRegistrationPublic`: prefixo errado → `cpf-prefix-mismatch` **e NÃO** persiste (continua PreRegistration); prefixo certo → `Complete` + `CollaboratorRegistrationCompleted` persistido.
- [ ] `completeCollaboratorRegistrationPublic` em colaborador já `Complete` → `collaborator-already-complete`.
- [ ] id malformado → `*-invalid-id` em ambos.
- [ ] W3 verde: typecheck + format:check + test + lint.

## Notas de disciplina

- W0 RED antes de `src/`. Helper `verifyCpfPrefix` **puro**; tempo via `Clock` no complete (fake clock no teste).
- Use case curried `(deps) => (cmd)`; erros kebab EN; reusa VO `Cpf` (`String(cpf).slice(0,3)`).
- Segurança: revalidar o prefixo no passo 2 (defense-in-depth) — registrar a divergência do legado no REVIEW.
