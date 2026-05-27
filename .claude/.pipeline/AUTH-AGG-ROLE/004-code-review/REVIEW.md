# Code Review — Ticket AUTH-AGG-ROLE — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer · **Data:** 2026-05-27
**Escopo revisado:**
- `src/modules/auth/domain/authorization/role-id.ts` (W1)
- `src/modules/auth/domain/authorization/role.ts` (W1)
- `tests/modules/auth/domain/authorization/{role-id,role}.test.ts` (W0)

---

## Issues encontradas

### 🔴 Crítica
Nenhuma.

### 🟡 Importante
Nenhuma.

### 🔵 Sugestão (não-bloqueante)

#### Sug 1 — `deepImmutable` para congelar `permissions` em runtime
`create`/`grant`/`revoke` usam `immutable()` (shallow) — congela o `Role` mas **não** o array `permissions`. O tipo `readonly Permission[]` já protege em compile-time; em runtime o array não está `Object.freeze`'d. Alinha com CONSIDER §3.B.8/§2 da SKILL (`deepImmutable` para VOs com sub-arrays). Padrão atual do projeto (`Contract`) também é shallow — então **não bloqueia**; registrar para uma eventual passada de hardening transversal.

#### Sug 2 — `name: string` vs VO `RoleName`
Decisão YAGNI correta agora. Se surgir unicidade/normalização de nome de papel, promover a VO `RoleName` (como já previsto no 000-request §Fora de escopo).

#### Sug 3 — evento `RoleCreated` para AuditLog
`create` não emite evento (fora do vocabulário do ADR-0024). Quando o use case administrativo de criar papel existir, avaliar emitir `RoleCreated` para alimentar o AuditLog (ADR-0022).

---

## Verificação por categoria

| Cat. | Resultado |
| :-- | :-- |
| **A. Domínio puro** | ✅ Zero `throw`/`class`/`this`/`any`/`let`. Arrays via `[...]`/`filter` — sem `push`/`splice`. Return types explícitos. |
| **§3.A.1 Agregado não-brandado** | ✅ `Role = Readonly<{...}>`; identidade via `id: RoleId`. Sem `Brand` na casca. Spread + `immutable()` nas transições. |
| **B. Branded id** | ✅ `RoleId` cast só em `role-id.ts` (`generate`/`rehydrate`), idioma idêntico a `contract-id.ts`. Erro string literal. |
| **E. Modular Monolith** | ✅ Importa só de `shared/*` e do próprio módulo (`./role-id.ts`, `./permission.ts`). Sem cross-módulo. |
| **F. ESM / NodeNext** | ✅ `.ts`; `import type` para `RoleId`/`Permission`. |
| **G. Idioma (EN)** | ✅ EN; erros kebab EN (`role-id-invalid`, `role-name-empty`). |
| **H. Tests** | ✅ AAA; helper `perm()` com `assert`+throw (válido em teste); idempotência de `grant` e no-op de `revoke` testados explicitamente. |

## Aderência aos CAs

CA1–CA3 (RoleId generate/rehydrate/inválido), CA4–CA6 (create válido/nome-vazio/dedupe), CA7 (hasPermission), CA8 (grant + idempotência), CA9 (revoke + no-op) — **todos cobertos** (11 `it()`).

## O que está bom

- Agregado não-brandado modelado corretamente — sem `as unknown as` em transição.
- `grant` idempotente e `revoke` no-op: semântica de conjunto correta, testada nas bordas.
- `dedupe` via `Set` no `create` — input sujo não vira estado inconsistente.
- Reuso fiel do padrão de ID do `contracts` (sem reinventar).

## Próximo passo

**APPROVED** → W3 (gate `ts-quality-checker`).
