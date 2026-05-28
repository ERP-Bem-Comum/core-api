# Code Review — Ticket AUTH-USECASE-AUTHENTICATE (A5) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer · **Data:** 2026-05-27
**Escopo:** `application/use-cases/authenticate-user.ts` (W1) + `authenticate-user.test.ts` (W0). Conferido contra DD-LOGIN-01.

---

## Issues
### 🔴 / 🟡
Nenhuma.
### 🔵 Sugestão
1. **Timing oracle (enumeration por tempo):** quando o e-mail não existe, o use case retorna sem chamar `verify` (argon2 ~30ms) → diferença de tempo observável vs e-mail existente. Mitigação clássica: hashear uma senha dummy mesmo sem user (tempo constante). Baixo risco agora (fake/sem rede); anotar para hardening quando o HTTP entrar.
2. **Trade-off de política** (já em DD-LOGIN-01): `Password.parse` no login falha para senhas antigas se a política endurecer → rehash-on-login. Registrado.

## Verificação

| Cat. | Resultado |
| :-- | :-- |
| **Application (regras)** | ✅ Factory `(deps) => (cmd) => Promise<Result>`; `Deps` Readonly só com ports; sem `throw`/`class`/lógica de negócio. |
| **DD-LOGIN-01** | ✅ parse falho → `invalid-credentials`; `findByEmail` null e `verify` false → mesma resposta; `user-disabled` **só após** verify (não revela conta antes da senha). |
| **Ordem** | ✅ valida → fetch → verify → parseActive → issue. `verify` antes de `parseActive` (não vaza disabled). |
| **Segurança** | ✅ senha em claro só passa por `Password.parse` + `verify`; nunca logada. Erro técnico do hasher propagado (não confundido com senha errada). |
| **Erros** | ✅ união completa; early-return (α). |
| **E. Modular Monolith** | ✅ só ports + domínio do próprio módulo. |
| **H. Tests** | ✅ popula via `registerUser` (realista); CA1 verifica o token emitido; CA5 prova disabled só após senha correta. |

## Aderência aos CAs
CA1 (sucesso + token verificável), CA2 (email inexistente), CA3 (senha errada), CA4 (email malformado), CA5 (disabled pós-senha) — cobertos (5 `it()`).

## O que está bom
- Respostas uniformes `invalid-credentials` (não vaza se é email ou senha) — anti-enumeration correto.
- `verify` antes de revelar `user-disabled` — não confirma existência de conta a quem não tem a senha.
- Reuso de `registerUser` no teste → fluxo realista register→login.

## Próximo passo
**APPROVED** → W3.
