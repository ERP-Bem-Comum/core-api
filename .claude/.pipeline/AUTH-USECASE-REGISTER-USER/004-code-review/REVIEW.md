# Code Review — Ticket AUTH-USECASE-REGISTER-USER (A4) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer · **Data:** 2026-05-27
**Escopo:** `application/use-cases/register-user.ts` (W1) + `register-user.test.ts` (W0).

---

## Issues
### 🔴 / 🟡
Nenhuma.
### 🔵 Sugestão
1. **Sem publicação de evento** — correto agora (auth sem EventBus/outbox). Quando o transporte de eventos do auth entrar, ligar `eventBus.publish(event)` **após** `save` (a sequência já deixa o `event` pronto no output). Registrar p/ o ticket de EventBus.
2. **Race de unicidade** — `findByEmail` + `save` não é atômico; duas requisições concorrentes do mesmo e-mail podem passar a checagem. O adapter MySQL (Fase P) deve ter `UNIQUE INDEX` em `email` como rede real (mapear erro → `email-already-registered`). Igual ao padrão de `sequentialNumber` em contracts.

## Verificação

| Cat. | Resultado |
| :-- | :-- |
| **Application (regras)** | ✅ Factory `(deps) => (cmd) => Promise<Result>`; `Deps` Readonly só com ports; sequência validate→fetch→domain→persist; sem lógica de negócio (decisões no domínio). Sem `throw`/`class`. |
| **Ordem** | ✅ valida input → unicidade → hash → `User.register` → `save`. `email-already-registered` antes do hash (não gasta argon2 à toa). |
| **DD-USER-04** | ✅ senha em claro só passa pelo `PasswordHasher`; o agregado recebe `PasswordHash`. Nunca persiste/loga claro. |
| **Erros** | ✅ união completa no return (`EmailError`/`PasswordPolicyError`/`'email-already-registered'`/`PasswordHasherError`/`UserRepositoryError`). Early-return (α) propaga com narrowing. |
| **E. Modular Monolith** | ✅ importa `shared/ports/clock`, domínio do próprio módulo, e o port `PasswordHasher` do próprio módulo. Sem cross-módulo. |
| **F/G** | ✅ `.ts`, `import type`; EN. |
| **H. Tests** | ✅ InMemory + fake hasher + `ClockFixed` (sem mocks); `occurredAt` determinístico; CA5 prova que persiste hash, não claro. |

## Aderência aos CAs
CA1 (sucesso+persistência), CA2 (email inválido), CA3 (senha curta), CA4 (duplicado), CA5 (hash não-claro) — cobertos (5 `it()`).

## O que está bom
- Unicidade checada **antes** do hash — não desperdiça argon2 em e-mail já existente.
- Reuso do `Clock` compartilhado e do fake hasher → teste rápido e determinístico, com paridade garantida vs argon2 real (mesma contract-suite do X1).
- Evento pronto no output → ligar o publish depois é trivial e não muda a assinatura.

## Próximo passo
**APPROVED** → W3.
