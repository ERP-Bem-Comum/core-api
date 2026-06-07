# W2 — Code Review · AUTH-USECASE-UPDATE-PROFILE

**Agente:** code-reviewer · **Round:** 1 · **Veredito:** APPROVED

## Checklist

- **Domínio puro** (`user.ts`): `updateProfile` continua sem I/O; extensão de `email?` reusa o
  mecanismo de patch existente. Sem `throw`, sem `class`, imutável (`immutable`). ✅
- **Application** (`update-user-profile.ts`): factory `(deps) => (cmd) => Promise<Result>`. Importa
  apenas ports (`UserReader`/`UserRepository`) + domínio; zero `adapters/`. ✅
- **Sequência canônica**: validar id → fetch → validar campos (VOs) → checar unicidade → domain →
  persist. Evento só após `save` OK. ✅
- **Atomicidade (FR-009)**: nenhuma escrita antes de todas as validações; único `save`. ✅
- **Unicidade de email (FR-007)**: SELECT-then-UPDATE (ADR-0020); diferencia próprio (no-op) de
  outro usuário (`email-already-registered`). ✅
- **exactOptionalPropertyTypes**: `patch` nunca recebe `undefined` explícito (atribuição condicional). ✅
- **Idioma**: código EN; erros internos kebab-case EN. ✅
- **Imports**: `.ts` explícito, `import type` para tipos (`verbatimModuleSyntax`). ✅

## Observações (não-bloqueantes)

- `user-id-invalid` será mapeado a 400 na rota (ticket `AUTH-HTTP-UPDATE-USER`).
- Persistência real do email atualizado (mapper Drizzle) validada no ticket HTTP / integração.

Sem issues bloqueantes.
