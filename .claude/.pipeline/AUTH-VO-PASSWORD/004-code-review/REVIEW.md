# Code Review — Ticket AUTH-VO-PASSWORD — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer · **Data:** 2026-05-27
**Escopo revisado:**
- `src/modules/auth/domain/credential/password-policy.ts` (W1)
- `src/modules/auth/domain/credential/password-hash.ts` (W1)
- `tests/modules/auth/domain/credential/{password-policy,password-hash}.test.ts` (W0)

---

## Issues encontradas

### 🔴 Crítica
Nenhuma.

### 🟡 Importante
Nenhuma.

### 🔵 Sugestão / nota

#### Nota de segurança (não é issue deste ticket) — propagar para A2/A6/X1
`Password` é uma string **em claro** na memória (inevitável: precisa ser hasheada). Os tickets que a consomem (`register`/`change-password` e o adapter `PasswordHasher`) devem garantir: **nunca logar, nunca persistir, nunca serializar** `Password`; descartá-la assim que o hash for produzido. Registrado para não se perder na borda.

---

## Verificação por categoria

| Cat. | Resultado |
| :-- | :-- |
| **A. Domínio puro** | ✅ Zero `throw`/`class`/`this`/`any`. Return types explícitos. |
| **B. Smart constructors & branded** | ✅ `parse` e `fromString` retornam `Result`; cast `as` único e auditado em cada arquivo, comentado. Erros = string literal union. Sync/puro. |
| **E. Modular Monolith** | ✅ Importam só de `shared/primitives/`. Sem cross-módulo. **Recorte domínio/efeito respeitado**: nenhum hashing — só política + tipo opaco. |
| **F. ESM / NodeNext** | ✅ `.ts`; `import type { Brand }`. |
| **G. Idioma (EN)** | ✅ `Password`/`PasswordHash`/`parse`/`fromString`; erros kebab EN. |
| **H. Tests** | ✅ AAA; **boundaries** 8/128 testados; preservação (sem normalização) verificada explicitamente. |

## Aderência aos CAs

| CA | Coberto? |
| :-- | :-- |
| CA1 (válida [8,128] + preservação) | ✅ inclui boundaries 8 e 128 e teste anti-normalização |
| CA2 (< 8 → `password-too-short`) | ✅ (`''` e 7 chars) |
| CA3 (> 128 → `password-too-long`) | ✅ |
| CA4 (hash não-vazio → ok preservado) | ✅ |
| CA5 (hash vazio/espaços → `password-hash-empty`) | ✅ |
| CA6 (total, sem throw) | ✅ |

## O que está bom

- **Decisão de não-normalizar** senha/hash está correta e explicitamente testada — erro clássico evitado.
- **Recorte limpo:** política (domínio) separada de hashing (efeito/port). O `PasswordHash` opaco não vaza o algoritmo do adapter.
- Racional NIST 800-63B documentado no código — justifica a ausência de regras de composição para o próximo leitor.
- `trim()` em `fromString` usado só para detectar vazio, sem mutar o valor retornado (comentado).

## Próximo passo

**APPROVED** → W3 (gate `ts-quality-checker`).
