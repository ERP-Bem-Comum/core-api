# Code Review — Ticket AUTH-AGG-SESSION — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer · **Data:** 2026-05-27
**Escopo:** `session/refresh-token-id.ts`, `session/refresh-token.ts` (W1) + 2 testes (W0). Conferido contra DD-SESSION-01..03.

---

## Issues

### 🔴 Crítica / 🟡 Importante
Nenhuma.

### 🔵 Sugestão (não-bloqueante)

1. **`_at` não usado em `rotate`** (já registrado no W1). Remover o parâmetro ou passar a gravar `rotatedAt` quando os use cases de sessão (A4) entrarem. Hoje aceito pelo lint (`^_`).
2. **`rotate` não é idempotente** — chamar duas vezes sobrescreve `replacedBy`. Improvável no fluxo (o use case faz `verify` antes, e um token `rotated` falha o `verify`), mas vale a guarda no use case A4. Não bloqueia.

---

## Verificação por decisão

| DD | Verificação |
| :-- | :-- |
| **SESSION-01** | ✅ `state(token, now)` computado; `verify(token, now)` é o gate. Sem tipos refinados (estado temporal — racional correto). |
| **SESSION-03** | ✅ precedência `revoked > rotated > expired > active` no `state`; `rotate`→`replacedBy`, `revoke`→`revokedAt` (idempotente). `tokenHash` opaco non-empty. |
| **SESSION-02** | ✅ agregado sem eventos. |

## Outras categorias

| Cat. | Resultado |
| :-- | :-- |
| **A. Domínio puro** | ✅ Zero `throw`/`class`/`any`. `immutable` + spread; sem mutação. **Switch exaustivo** em `verify` sem `default`/`throw` (cobre os 4 estados — §3.C.4). `!== null` explícito (strict-boolean). |
| **B. Branded id** | ✅ `RefreshTokenId` cast só no id-file; idioma idêntico a role-id/user-id. |
| **E. Modular Monolith** | ✅ importa só `shared/*` + `../identity/user-id.ts` + `./refresh-token-id.ts`. Sem cross-módulo. |
| **F/G** | ✅ `.ts`, `import type`; EN + erros kebab EN. |
| **H. Tests** | ✅ datas fixas (`ISSUED`/`EXPIRES`/`BEFORE_EXP`/`AFTER_EXP`) → determinístico; **precedência revoked>expired testada explicitamente** (CA9); boundaries de tempo. |

## Aderência aos CAs

CA1-3 (id), CA4-6 (issue válido/hash-vazio/expiry), CA7-10 (state nos 4 estados, com precedência), CA11-12 (revoke/rotate + verify), CA13-14 (verify ativo/expirado) — **todos cobertos** (14 `it()`).

## O que está bom

- Distinção entre **estado temporal** (computado) e **armazenado** (User refinado) bem aplicada — racional documentado em DD-SESSION-01.
- `verify` como switch exaustivo traduzindo estado→erro: legível e à prova de novo estado (o compilador obriga tratar).
- Precedência `revoked > expired` testada (token revogado E expirado → `revoked`).

## Próximo passo
**APPROVED** → W3 (gate `ts-quality-checker`).
