# W2 — REVIEW · PARTNERS-COLLABORATOR-COMPLETE-REGISTRATION

**Skill:** code-reviewer · **Round:** 1 · **Veredito:** ✅ APPROVED

## Escopo auditado (read-only)

- `application/use-cases/verify-cpf-prefix.ts`
- `application/use-cases/check-first-three-numbers-cpf.ts`
- `application/use-cases/complete-collaborator-registration-public.ts`
- `tests/modules/partners/application/collaborator-public-registration.test.ts`

## Aderência (`.claude/rules/application.md`)

- ✅ Use cases factory `(deps) => (cmd) => Promise<Result<O,E>>`; sequência validar → fetch → (verify) →
  domain → persist; evento só após `save` ok.
- ✅ `verifyCpfPrefix` **puro** (sem IO), single source da regra dos 3 dígitos, reusado.
- ✅ Sem import de `adapters/`; sem regra de estado de negócio fora do domínio (a transição é
  `Collaborator.completeRegistration`).
- ✅ Erros kebab EN; `import type`; `#src/*`; `CompleteRegistrationInput` via destructuring do rest.
- ✅ Domínio e `completeCollaboratorRegistration` admin **intocados**.

## Segurança (foco do ticket)

- ✅ **Defense-in-depth**: o passo 2 público revalida o prefixo do CPF antes de transicionar. Corrige a
  fraqueza do legado (POST `/complete-registration` sem revalidação → qualquer `{id}` completaria — IDOR).
  Divergência documentada no `000-request.md` e no W1.
- ✅ Teste cobre o caso crítico: prefixo errado → `cpf-prefix-mismatch` **e NÃO persiste** (segue
  PreRegistration verificado via `findById`).
- ⚠️ **Nota (não-bloqueante)**: 3 dígitos do CPF são uma verificação **fraca** (1000 combinações;
  enumerável). É o que o legado especifica para o fluxo público. Quando a borda HTTP existir, mitigar com
  rate-limit/lockout por `{id}` + link tokenizado/expirável no e-mail (ADR de segurança). Fora do escopo
  desta camada de aplicação; registrar para o ticket HTTP.

## Conclusão

Fluxo público correto, mais seguro que o legado, sem scope creep. **APPROVED** — segue para W3.
