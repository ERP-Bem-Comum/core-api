# Code Review — Ticket AUTH-ADAPTER-ARGON2-HASHER (X1) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer · **Data:** 2026-05-27
**Escopo:** `application/ports/password-hasher.ts`, `adapters/crypto/password-hasher.{fake,argon2}.ts` (W1) + contract + 2 tests (W0). Conferido contra DD-CRYPTO-01 / ADR-0024.

---

## Issues
### 🔴 / 🟡
Nenhuma.
### 🔵 Sugestão
1. **Custo do argon2 em CI:** os params OWASP (19 MiB, t=2) fazem cada hash levar dezenas de ms — a suite roda ~7 hashes (~200-300ms). Aceitável; se a suíte global crescer e isso pesar, isolar o `argon2.test.ts` num grupo lento.
2. **Params como constante** — quando o use case `authenticate` precisar revalidar/upgrade de params (rehash on login se params mudarem), expor `PARAMS` ou um detector de "needs rehash". Futuro (A5).

## Verificação

| Aspecto | Resultado |
| :-- | :-- |
| **DD-CRYPTO-01** | ✅ argon2id via `hash-wasm` (WASM puro, sem toolchain); params OWASP; salt 16 bytes aleatório; `outputType: 'encoded'` (PHC). Impl própria não usada. |
| **Adapter (regra)** | ✅ `try/catch → Result` na borda; não vaza `Error`; senha em claro **não** logada nem no payload de erro. |
| **Fake** | ✅ sha256 one-way (não guarda senha) + `timingSafeEqual` (compara em tempo constante, com guarda de comprimento). Determinístico → serve à contract-suite. |
| **Port** | ✅ `type Readonly<{}>` async em `application/ports/` (capacidade técnica, DD-PORTS-01). Recebe `Password`, devolve `PasswordHash`. |
| **E. Modular Monolith** | ✅ importa `shared/*`, domínio do próprio módulo, e a dep externa só no adapter (não no domínio/application port). |
| **F/G** | ✅ `.ts`, `import type`; EN; erros kebab EN. |

## Aderência aos CAs
CA1 (hash ok), CA2 (verify correto=true), CA3 (verify errado=false) — fake **e** argon2. CA4 (salt→hashes diferentes), CA5 (PHC `$argon2id$`) — argon2. **Todos cobertos** (8 `it()`).

## O que está bom
- Mesma contract-suite valida fake e real → o use case pode usar o fake (rápido) nos testes e o argon2 em produção, com garantia de paridade de comportamento.
- WASM puro: o adapter não reintroduz toolchain no Docker (honra ADR-0020) — decisão DD-CRYPTO-01 materializada.
- argon2 real exercitado de verdade no W0/W1 (não mockado) — salt e PHC verificados.

## Próximo passo
**APPROVED** → W3.
