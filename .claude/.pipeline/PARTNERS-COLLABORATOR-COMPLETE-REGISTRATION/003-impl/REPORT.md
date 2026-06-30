# W1 — GREEN · PARTNERS-COLLABORATOR-COMPLETE-REGISTRATION

**Skill:** ports-and-adapters · **Resultado:** GREEN (12/12)

## Arquivos criados

- `application/use-cases/verify-cpf-prefix.ts` — helper puro `verifyCpfPrefix(cpf, prefixRaw)`:
  normaliza dígitos, exige exatamente 3, compara com `String(cpf).slice(0,3)`. Erros
  `CpfPrefixError` = `'cpf-prefix-invalid'` | `'cpf-prefix-mismatch'`.
- `application/use-cases/check-first-three-numbers-cpf.ts` — passo 1 (query): rehydrate id → findById
  (not-found) → `verifyCpfPrefix` → retorna o `Collaborator`.
- `application/use-cases/complete-collaborator-registration-public.ts` — passo 2 seguro: rehydrate id →
  findById → `verifyCpfPrefix` (**revalida**) → `Collaborator.completeRegistration` → `save`.

## Decisões de design

- **Helper compartilhado** `verifyCpfPrefix` — único ponto da regra dos 3 dígitos, reusado pelos 2 use cases.
- **Defense-in-depth no passo 2** — o complete público revalida o prefixo do CPF antes de transicionar.
  Diverge do legado (POST `/complete-registration` não revalida → IDOR latente). Corrige a fraqueza sem
  borda HTTP (entrega o use case reusável).
- **`completeCollaboratorRegistration` admin intocado** — coexiste; o público é um caminho separado.
- **D3 mantido** — sem subconjunto obrigatório; o domínio decide a transição (all-optional).

## Confirmação GREEN

```
ℹ tests 12 · pass 12 · fail 0
```
