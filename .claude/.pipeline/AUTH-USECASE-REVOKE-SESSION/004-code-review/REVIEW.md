# Code Review — Ticket AUTH-USECASE-REVOKE-SESSION — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer · **Data:** 2026-05-27
**Escopo revisado:** `src/modules/auth/application/use-cases/revoke-session.ts`

---

## Issues encontradas

Nenhuma 🔴 crítica, nenhuma 🟡 importante.

### 🔵 Sugestão (não-bloqueia)

- As 3 primeiras linhas (`hash` → `findByTokenHash` → `if !ok` → `if null return ok`) repetem-se entre
  `revokeSession` e `revokeAllSessions`. Extrair um helper (`resolveByClear(deps, clear)`) é possível, mas o
  *early return* `ok(undefined)` no caminho null tornaria o helper menos direto que a duplicação atual de 3
  linhas legíveis. **Mantido como está** — extrair criaria indireção sem ganho claro (YAGNI).

## Conformidade verificada

| Categoria | Resultado |
| :-- | :-- |
| D — factory functions `(deps) => (cmd) => Promise<Result<...>>` | ✅ ambos |
| D — `Deps` `Readonly<>`, sem import de `adapters/` | ✅ |
| D — `Clock.now()` (nunca `new Date()`) | ✅ |
| A — zero `throw`/`class`/`this`/`any`; return types explícitos | ✅ |
| F — `.ts` nos imports, `import type`, sem require/enum/namespace | ✅ |
| G — idioma EN; erros kebab; `ok` helper | ✅ |
| DD-SESSION-06 — idempotência (null → `ok`) | ✅ ambos os use cases |
| DD-SESSION-06 — `revokeAllSessions` resolve `userId` pelo refresh apresentado (sem `userId` no contrato) | ✅ |
| DD-SESSION-06 — sem evento no output (espelha `authenticate-user`) | ✅ |

## O que está bom

- `revokeAllSessions` reusa **exatamente** o `findRevocableByUserId` entregue em A6a — o primitivo de reuse
  detection serve o logout global sem novo método de repo. Bom reuso.
- Idempotência consistente nos dois fluxos; `revoke` de já-revogado é no-op pelo agregado (DD-SESSION-03),
  então a 2ª chamada não altera `revokedAt` (coberto por CA3).
- `revokeAllSessions` correto mesmo quando o refresh apresentado já está revogado (revoga os demais revogáveis).
- Lint/format/typecheck verdes já no W1 (sem ciclo de correção).

## Próximo passo

- **APPROVED** → avança para W3 (`ts-quality-checker`).
