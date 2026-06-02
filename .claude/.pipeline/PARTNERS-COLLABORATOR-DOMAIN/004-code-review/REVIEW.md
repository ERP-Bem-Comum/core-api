# Code Review — Ticket PARTNERS-COLLABORATOR-DOMAIN — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-06-01T19:40Z
**Escopo revisado:** os 12 arquivos de `src/modules/partners/domain/collaborator/` + `tests/.../collaborator.test.ts`, confrontados com `domain/supplier` e `domain/financier` (templates aprovados).

---

## Verificações do escopo (000-request.md)

| # | Critério | Resultado |
| --- | --- | --- |
| 1 | Domain puro (zero throw/class/this/any/extends Error/new Date) | ✅ grep nos 12 arquivos: nenhum anti-padrão. `Result<T,E>`, `immutable`, erros string-union kebab. |
| 2 | 2 dimensões de estado ortogonais | ✅ `registrationStatus: 'PreRegistration'\|'Complete'` campo no core; `status` discriminado, `Inactive` carrega `disableBy`+`deactivatedAt` (`types.ts`). |
| 3 | `completeRegistration` sem subconjunto obrigatório (D3) + guard + enums opcionais | ✅ guard `already-complete` (`collaborator.ts:93`); enums pessoais `null → ok(null)` senão `parse` (`:95-107`); merge preserva o `status` (Active/Inactive) via spread. |
| 4 | `deactivate` exige disableBy válido; `reactivate` limpa via narrowing | ✅ `DisableReason.parse` (`:145`); reactivate destrutura `disableBy`/`deactivatedAt` após guard `Active` (narrowing → Inactive) (`:170-173`). |
| 5 | `rehydrate` reaplica coerência, sem evento | ✅ Inactive sem disableBy/deactivatedAt → `collaborator-inactive-requires-disable-reason` (`:190-191`); retorna `Collaborator`, sem evento. |
| 6 | Enums código legado (D2 race/gender opacos) + erro kebab | ✅ 7 enums com `parse`; race/genderIdentity documentados como sensíveis/opacos; cada erro dedicado (`invalid-race`, etc.). |
| 7 | Eventos EN passado + `occurredAt` injetado | ✅ `CollaboratorRegistered/RegistrationCompleted/Deactivated/Reactivated`; `occurredAt` vem de `registeredAt`/`at`, nunca `new Date()`. |
| 8 | Imports `#src/`+`.ts`+`import type`; cpf reusa kernel | ✅ `* as Cpf` de `#src/shared/kernel/cpf.ts`; `import type` para tipos; namespaces para runtime. |

---

## Categorias do checklist

- **A (domínio):** ✅ tudo `Readonly` via `immutable`; return types explícitos; sem `let` reatribuído; sem mutação.
- **B (smart constructors):** ✅ `as` só dentro de `parse`/`rehydrate` dos VOs após validação (`has()`/`isUuidV4`).
- **C (discriminated union):** ✅ `status` discriminador EN; `register`/`rehydrate` ramificam por status. `registrationStatus` é campo (correto: não refina shape porque D3 não exige campos).
- **F/G:** ✅ ESM `.ts`, `import type`, sem enum/require; naming EN; erros kebab; doc-comments PT permitidos.
- **H (teste):** ✅ 21/21; UUID v4 real (`generate`); enum test table-driven; asserções de regra (status, registrationStatus, disableBy, erros nomeados), não só "não lança".

---

## O que está bom

- **Modelagem das 2 dimensões** resolvida com elegância: soft-delete discriminado (reusa o padrão supplier/financier) + registro como campo monotônico — evita explosão de 4 variantes sem perder type-safety.
- **D3 tratado por evidência** (OpenAPI all-optional), não por chute: `completeRegistration` só flipa + merge, com o seam documentado para um guard futuro se a P.O. definir campos mandatórios.
- `completeRegistration` preserva corretamente o `status` (um Inactive pode ter o cadastro completado) — dimensões genuinamente ortogonais, sem acoplamento acidental.
- `deactivate` carrega `disableBy` também **no evento** (não só no estado) — consumidores do evento têm o motivo sem reler o agregado.
- 7 enums consistentes com `service-category.ts`; race/genderIdentity com nota explícita de sensibilidade (D2).

---

## Próximo passo

- **APPROVED:** pipeline-maestro avança para W3 (gate default — domínio puro, sem integração).
