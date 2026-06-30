# Code Review — Ticket AUTH-USECASE-ASSIGN-ROLE — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer · **Data:** 2026-05-27
**Escopo revisado:** `src/modules/auth/application/use-cases/assign-role.ts`

---

## Issues encontradas

Nenhuma 🔴 crítica, nenhuma 🟡 importante.

### 🔵 Sugestão (não-bloqueia)

- A permissão `'user:assign-role'` está inline. Como é usada uma vez e o VO `Permission` a valida, manter
  inline é aceitável; extrair para constante nomeada só compensaria se reusada noutro use case (YAGNI).

## Conformidade verificada

| Categoria | Resultado |
| :-- | :-- |
| D — factory function; `Deps` `Readonly<>`; sem import de `adapters/` | ✅ |
| D — `Clock.now()` (nunca `new Date()`) | ✅ |
| A — zero `throw`/`class`/`this`/`any`; return types explícitos | ✅ |
| F — `.ts` nos imports; `import type` p/ tipos, `authorize` como valor | ✅ |
| G — idioma EN; erros kebab | ✅ |
| DD-USER-07 — authz do ator (fail-closed → `forbidden`) | ✅ ator null/disabled/sem-permissão |
| DD-USER-02 — `authorize` recebe `ActiveUser`, chamado pelo use case | ✅ (1ª aplicação real) |
| Distinção de erros target/role (`user-not-found`/`user-disabled`/`role-not-found`) | ✅ |
| Idempotência (`User.assignRole`/`grant` no-op) | ✅ (CA8) |

## O que está bom

- **Authz antes de carregar target/role** — um ator não autorizado recebe `forbidden` sem aprender se o
  target ou o role existem (não vaza existência). Boa ordem de segurança.
- **Fail-closed exemplar**: todo caminho de ator não-utilizável (inexistente, desabilitado, sem permissão, e
  até o caso impossível de a permissão constante não parsear) colapsa em `forbidden`.
- Primeira materialização de `authorize` (DD-USER-02) — fecha o ciclo de RBAC iniciado nos agregados.
- typecheck/lint/format/testes (8/8; 151/151 auth) verdes de primeira — sem round de correção.

## Próximo passo

- **APPROVED** → avança para W3 (`ts-quality-checker`).
