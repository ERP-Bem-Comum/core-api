# Code Review — Ticket AUTH-ADAPTER-JWT-ISSUER (X2) — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer · **Data:** 2026-05-27
**Escopo:** `application/ports/token-issuer.ts`, `adapters/crypto/token-issuer.{fake,es256}.ts` (W1) + contract + 2 tests (W0). Conferido contra DD-TOKEN-01.

---

## Issues
### 🔴 / 🟡
Nenhuma.
### 🔵 Sugestão
1. **`token-expired` mapeado mas não testado** — testar expiração exigiria time-travel (jose usa relógio do sistema). O mapeamento `ERR_JWT_EXPIRED → 'token-expired'` é defensivo; o BFF/refresh (A6) exercitará na prática. Se quiser cobrir, injetar `currentDate` via Clock no adapter (gold-plating agora).
2. **JWKS/rotação** — quando houver >1 validador, expor `kid` + JWKS (já anotado como gatilho em DD-TOKEN-01).

## Verificação

| Aspecto | Resultado |
| :-- | :-- |
| **DD-TOKEN-01** | ✅ ES256 via jose; `alg` fixo na assinatura **e** verificação (`algorithms: ['ES256']`) — barra **algorithm-confusion** (ex.: `alg: none`/HS via chave pública). `iss` validado. `sub`=userId; sem permissions no token. |
| **Segurança (CA5)** | ✅ teste prova que token de chave A **não** valida com pública de B → o BFF (pública) não forja. Assimetria materializada. |
| **Adapter (regra)** | ✅ `try/catch → Result`; não vaza `Error`; chaves injetadas (não hardcoded). Disable de `prefer-readonly-parameter-types` justificado (CryptoKey externo). |
| **Port** | ✅ `type Readonly<{}>` async em `application/ports/`. |
| **E. Modular Monolith** | ✅ dep externa (`jose`) só no adapter; port/domínio não a conhecem. |
| **F/G** | ✅ `.ts`, `import type` (incl. `webcrypto`); EN; erros kebab EN. |

## Aderência aos CAs
CA1 (issue), CA2 (verify round-trip), CA3 (inválido→err) — fake **e** es256. CA4 (formato JWT), CA5 (anti-forja) — es256. **Todos cobertos** (8 `it()`).

## O que está bom
- `algorithms: ['ES256']` explícito na verificação — fecha a porta de algorithm-confusion (erro clássico de JWT).
- CA5 testa a propriedade de segurança que justifica o assimétrico (não só o happy-path).
- Mesma contract-suite valida fake e real → use cases A5/A6 usam o fake (rápido) com paridade garantida.

## Próximo passo
**APPROVED** → W3.
