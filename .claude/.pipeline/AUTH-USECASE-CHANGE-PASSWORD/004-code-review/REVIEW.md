# Code Review — Ticket AUTH-USECASE-CHANGE-PASSWORD — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer · **Data:** 2026-05-27
**Escopo revisado:** `src/modules/auth/application/use-cases/change-password.ts`

---

## Issues encontradas

Nenhuma 🔴 crítica, nenhuma 🟡 importante.

### 🔵 Sugestões (não-bloqueiam)

1. **Ordem `parseActive` antes do `verify` da senha** — revela `user-disabled` antes da prova de senha,
   divergindo do padrão anti-enumeration do login (DD-LOGIN-01, onde `user-disabled` só aparece após a senha
   correta). **Aceitável aqui:** o fluxo é **autenticado** (`userId` vem do access token), não anônimo —
   não há enumeration por terceiro sem token. Mantido.

2. **Estado parcial sob falha da revogação** — se `userRepo.save` (senha) tem sucesso mas `revokeAllForUser`
   falha, a senha fica trocada com sessões antigas ainda ativas (retorna o erro do repo). **A ordem está
   correta** (trocar a senha — operação primária — antes de revogar; inverter deslogaria o usuário sem
   garantir a nova senha). A atomicidade plena depende de transação cross-repo (Fase P / MySQL) — fora de
   escopo agora. Documentado em DD-USER-06.

## Conformidade verificada

| Categoria | Resultado |
| :-- | :-- |
| D — factory function; `Deps` `Readonly<>`; sem import de `adapters/` | ✅ |
| D — `Clock.now()` (capturado em `now`, usado em `changePassword` e na revogação) | ✅ |
| A — zero `throw`/`class`/`this`/`any`; return types explícitos | ✅ |
| F — `.ts` nos imports, `import type`, sem require/enum/namespace | ✅ |
| G — idioma EN; erros kebab; `ok`/`err` | ✅ |
| DD-USER-06 — re-auth antes de trocar; revogação **após** save | ✅ |
| DD-USER-06 — revoga todas (`findRevocableByUserId`+`revoke`) | ✅ |
| DD-LOGIN-01 — `invalid-credentials` uniforme p/ null/parse-falho/verify-false | ✅ |
| Política aplica **só à nova senha** (`Password.parse(new)` → `PasswordPolicyError`; current parse-falho → `invalid-credentials`) | ✅ |

## O que está bom

- Ordem das operações **correta sob falha** — contraste com o A6b (onde a ordem foi rejeitada): aqui a troca
  (primária) precede a revogação (consequência), o que é o trade-off seguro.
- `revokeAllForUser` reusa `findRevocableByUserId`+`revoke` (A6a), consistente com `revokeAllSessions` (A7) —
  3ª ocorrência do loop; extração compartilhada anotada para refactor futuro (DD-USER-06), não bloqueia.
- Re-autenticação obrigatória + revogação total = aderência forte a OWASP ASVS V3.3.
- typecheck/lint/format verdes no W1 (1 ajuste de tipo no helper de teste + prettier, sem mudança de lógica).

## Próximo passo

- **APPROVED** → avança para W3 (`ts-quality-checker`).
