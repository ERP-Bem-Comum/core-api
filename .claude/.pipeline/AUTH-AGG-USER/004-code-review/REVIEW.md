# Code Review — Ticket AUTH-AGG-USER — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer · **Data:** 2026-05-27
**Escopo revisado:** `identity/user-id.ts`, `identity/user/{types,errors,events,user}.ts`, `authorization/authorize.ts` (W1) + 3 arquivos de teste (W0). Conferido contra `handbook/domain/auth/design-decisions.md` (DD-USER-01..05).

---

## Issues encontradas

### 🔴 Crítica
Nenhuma.

### 🟡 Importante
Nenhuma.

### 🔵 Sugestão (não-bloqueante)

#### Sug 1 — `assignRole` emite `RoleAssigned` mesmo quando idempotente
Quando o role já está presente, `assignRole` não duplica (correto), mas ainda retorna o evento `RoleAssigned`. Semanticamente, "atribuído" quando nada mudou é discutível. **Decisão de borda:** o use case pode optar por **não publicar** o evento se o estado não mudou (comparar `next.roles === user.roles`). Registrar para o ticket de use case (A7). Não bloqueia — o domínio devolver o evento é aceitável; quem publica decide.

#### Sug 2 — Barrel `index.ts` do agregado (§3.H.1)
A SKILL prevê `identity/user/index.ts` como barrel (`import * as User from './index.ts'`). Aqui os tipos são re-exportados via `user.ts`, que funciona e mantém o namespace coeso. Quando o módulo precisar de um ponto único de import do agregado, criar o `index.ts`. Não bloqueia.

---

## Verificação por decisão (DD-USER)

| DD | Verificação |
| :-- | :-- |
| **01** status refinado | ✅ `ActiveUser \| DisabledUser`; `disabledAt: Date` obrigatório no desabilitado; `parseActive` é o gate (`Result<ActiveUser,'user-disabled'>`). Agregado **não-brandado** (§3.A.1). |
| **02** authorize | ✅ função pura em `authorization/authorize.ts`; aceita só `ActiveUser` (fail-closed por tipo); default deny; reusa `Role.hasPermission`. |
| **03** transições | ✅ `register`/`disable`/`changePassword`/`assignRole` aceitam `ActiveUser`, retornam `{user,event}`; `at: Date` injetado (sem `new Date()`). |
| **04** senha/UserId | ✅ `changePassword(_, newHash: PasswordHash, _)`; domínio não vê senha em claro; `UserId` branded (espelha `role-id.ts`). |
| **05** eventos | ✅ 4 eventos flat, PascalCase passado, payload só metadados; `PasswordChanged` **sem** hash (verificado no teste CA7). |

## Outras categorias

| Cat. | Resultado |
| :-- | :-- |
| **A. Domínio puro** | ✅ Zero `throw`/`class`/`this`/`any`. `immutable()` nas transições; dedupe via `Map`, sem `push`/`splice`; `[...]` em `assignRole`. Return types explícitos. |
| **E. Modular Monolith** | ✅ Só imports intra-módulo + `shared/*`. Sem cross-módulo. |
| **F. ESM/NodeNext** | ✅ `.ts`; `import type`/`export type` (verbatimModuleSyntax). |
| **G. Idioma** | ✅ EN; erros kebab EN. |
| **H. Tests** | ✅ AAA; helpers de setup com fixture de data fixa (`AT`) — eventos determinísticos; idempotência e fail-closed testados; CA7 anti-vazamento. |

## Aderência aos CAs

CA1–CA3 (UserId), CA4 (register + dedupe), CA5 (parseActive), CA6 (disable), CA7 (changePassword sem hash), CA8 (assignRole idempotente), CA9–CA10 (authorize ok/forbidden) — **todos cobertos** (13 `it()`).

## O que está bom

- State machine refinada implementada com disciplina — `disable`/`authorize` literalmente não compilam para `DisabledUser`.
- Evento como valor de retorno → testes assertam sem espião de bus; `AT` fixo torna `occurredAt` determinístico.
- Autocorreções do W1 (path 5 níveis, re-export, ajuste de tipo no teste) bem documentadas no REPORT.

## Próximo passo
**APPROVED** → W3 (gate `ts-quality-checker`).
