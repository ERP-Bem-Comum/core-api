# Code Review — CTR-USECASE-ACTIVATE-CONTRACT — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-05-27
**Escopo revisado:** `application/use-cases/activate-contract.ts` (novo) + `activate-contract.test.ts` (novo).

---

## Conformidade (regras de application)

- ✅ **Factory** `(deps) => (cmd) => Promise<Result>`; `Deps` é `Readonly<>` com **ports** (sem
  import de adapters). `clock` removido — sem dead dependency.
- ✅ **Sequência canônica:** validar (`contractId`, `signedAt`) → fetch (`findById`) → domain
  (narrowing + `Contract.activate`) → persist (`save`). **Evento `ContractActivated` só vai ao
  `save`** (publicado após persistência) — padrão CTR-OUTBOX-INTEGRATION-IN-REPOS.
- ✅ **Regra no lugar certo:** a transição é do domínio (`Contract.activate`); o use case só
  **orquestra** a RN-CV-02 (consulta `documentRepo` cross-agregado + `some(signed_contract & Active)`).
  Nenhum `if` de cálculo de estado de negócio na application.
- ✅ **Narrowing inline** (`status !== 'Pending'`) usa a union discriminada — sem `parsePending` novo.
- ✅ Erros: union completo (`ContractIdError | ... | ContractError | repos`). Sem `throw`/`class`/`any`.
- ✅ Testes: AAA, fakes InMemory injetáveis, UUID válidos, 4 CAs (happy + 3 caminhos de erro).

## 🔵 Sugestão → ENDEREÇADA (2026-05-27)

- Linha final simplificada para `return ok(activated.value)` (a pedido do usuário). 4/4 verde,
  typecheck OK. Veredito permanece **APPROVED**.

## Gate verificado (read-only)

```
pnpm run typecheck   → OK
pnpm run format:check → OK
pnpm run lint        → OK
node --test activate-contract.test.ts → 4/4
```

## Próximo passo

**APPROVED → W3.** A 🔵 fica registrada (estilo).
