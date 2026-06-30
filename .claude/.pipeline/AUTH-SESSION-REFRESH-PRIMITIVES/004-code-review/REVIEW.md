# Code Review — Ticket AUTH-SESSION-REFRESH-PRIMITIVES — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-05-27
**Escopo revisado:**
- `src/modules/auth/application/ports/refresh-token-minter.ts`
- `src/modules/auth/adapters/crypto/refresh-token-minter.node.ts`
- `src/modules/auth/adapters/crypto/refresh-token-minter.fake.ts`
- `src/modules/auth/domain/session/refresh-token-repository.ts`
- `src/modules/auth/adapters/persistence/repos/refresh-token-repository.in-memory.ts`

---

## Issues encontradas

Nenhuma 🔴 crítica, nenhuma 🟡 importante.

### 🔵 Sugestão

- O `hash: (raw) => \`${raw}-hash\`` (fake) e `hash: sha256Hex` (node) não têm return type inline — mas o tipo
  é fixado pelo contexto (`: RefreshTokenMinter`), idêntico ao padrão do `mint` preexistente. Sem ação: `tsc`
  e ESLint (exceção de expressão em contexto tipado) passam verdes. Consistência mantida.

## Conformidade verificada

| Categoria | Resultado |
| :-- | :-- |
| D — Ports são `type Readonly<{...}>`, nunca `interface`/`class` | ✅ ambos os ports |
| D — adapter InMemory para o port | ✅ `findRevocableByUserId` implementado no InMemory |
| A — zero `throw`/`class`/`this`/`any` | ✅ |
| A — array de domínio `readonly T[]` | ✅ `readonly RefreshToken[]` |
| F — `.ts` nos imports + `import type` | ✅ `import type { UserId }`, etc. |
| ESLint strict-boolean-expressions | ✅ `t.revokedAt === null` e `?? null` explícitos |
| G — idioma EN no código, PT só em comentário/doc | ✅ |
| DD-SESSION-05 | ✅ `findRevocableByUserId` = base da reuse detection; `hash` reaplica a função do `mint` |
| DD-SESSION-01 | ✅ filtro `revokedAt === null` (armazenável), **sem** estado temporal `active`/`expired` no repo |
| DD-PORTS-01 / §3.H.2 | ✅ repo permanece no `domain/` (padrão estabelecido do módulo; A6a só adiciona método) |

## O que está bom

- `sha256Hex` extraído no node adapter elimina duplicação entre `mint` e `hash` e **garante** o invariante
  `hash(mint().token) === mint().tokenHash` por construção (mesma função), em vez de por coincidência.
- Comentários dos ports citam as decisões (DD-SESSION-01/05) com o racional do critério armazenável — rastreável.
- YAGNI respeitado: sem `revokeAllByUserId`, sem adapter MySQL prematuro.
- Evidência objetiva de W1: 20/20 nos testes do ticket, 122/122 na suíte auth, `tsc --noEmit` limpo.

## Próximo passo

- **APPROVED** → avançar para W3 (`ts-quality-checker`).
