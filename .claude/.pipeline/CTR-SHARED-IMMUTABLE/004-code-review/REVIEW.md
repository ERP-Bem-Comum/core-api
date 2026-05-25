# W2 — Code Review read-only — CTR-SHARED-IMMUTABLE

> **Reviewer:** skill [`code-reviewer`](../../../skills/code-reviewer/SKILL.md) (pipeline W2 — read-only).
> **Rounds:** 1.
> **Veredito:** **APPROVED.**
> **Data:** 2026-05-20.
> **Roteado via:** `Agent(contratos-orchestrator)` — protocolo **Opção B**, 3ª de 4 invocações (W2 apenas).
> **Nota de protocolo:** Subagent não escreve em `.claude/.pipeline/*`. Conteúdo deste REVIEW devolvido via sumário do Agent e escrito por Claude principal.

---

## Escopo do diff

| Arquivo | Tipo | Δ LOC |
| :--- | :--- | :--- |
| `src/shared/immutable.ts` | **Criação** | +50 (incl. 38 LOC de JSDoc) |
| `src/shared/index.ts` | **Edit** (1 linha) | +1 |
| `tests/shared/immutable.test.ts` | **Criação** (W0) | +292 |

Auditoria deste round cobre os 3 arquivos. O test file foi criado em W0 e revisado tangencialmente — esta wave foca primariamente nos arquivos de `src/`.

---

## 1. Checklist contra `CLAUDE.md` raiz

| # | Regra | Verificação | Status |
| :-- | :-- | :-- | :-- |
| 1 | §"Regras invariantes" → "`throw` proibido" | `grep -nE '\bthrow\b' src/shared/immutable.ts` → 0 hits | ✅ |
| 2 | §"Sem `class`, sem `this`" | `grep -nE '\bclass\b\|\bthis\.'` → 0 hits | ✅ |
| 3 | §"Sem `any`" | `grep -nE ': any\b\|<any>\|\bas any\b'` → 0 hits | ✅ |
| 4 | §"Imutabilidade absoluta" → `Readonly<T>` no retorno | `immutable.ts:27` — `: Readonly<T>` no retorno de `immutable` | ✅ |
| 5 | §"Sem `let` reatribuído em domínio, sem `.push/.splice/.sort`" | `grep -nE '\blet\b\|\.push\(\|\.splice\(\|\.sort\('` → 0 hits | ✅ |
| 6 | §"Imports relativos com `.ts`" | `index.ts:8` → `from './immutable.ts'`; `test.ts:28` → `from '#src/shared/immutable.ts'` | ✅ |
| 7 | §"`import type { X }`" | N/A — `immutable.ts` zero imports | ✅ |
| 8 | §"Domínio 100% sync" | Zero `async`/`Promise`/`await` em `immutable.ts` | ✅ |
| 9 | §"Anti-padrão #7: `throw new Error` no `default` exaustivo" | N/A — não há `switch` | ✅ |
| 10 | §"Anti-padrão #10: `npm` em doc/script" | N/A — só editou TS | ✅ |
| 11 | §"Trabalho não-trivial passa pela pipeline W0→W3" | Ticket aberto em `.claude/.pipeline/CTR-SHARED-IMMUTABLE/`; W0/W1 REPORTs escritos | ✅ |
| 12 | §"Sem `extends Error`, sem `new Error`" | `grep -nE 'extends Error\|new Error'` → 0 hits | ✅ |

---

## 2. Checklist contra a entrevista 0001 — Bloco B

| Decisão | Verificação | Status |
| :-- | :-- | :-- |
| **DO B§10** (master doc L862): "Identidade fixa via facade `immutable()` / `deepImmutable()` em `shared/immutable.ts`. Esconde `Object.freeze`." | Arquivo criado em `src/shared/immutable.ts`, exporta exatamente `immutable` e `deepImmutable`, ambos delegando para `Object.freeze` internamente — facade pura | ✅ |
| **DON'T B§5** (L898): "`Object.freeze` direto no código de domínio — usa `immutable`/`deepImmutable`." | `Object.freeze` aparece apenas em `src/shared/immutable.ts` (L27 e L49). O test file usa `Object.isFrozen` (leitura, não escrita — não viola a DON'T) | ✅ |
| **CONSIDER B§2** (L934): "`deepImmutable` para VOs compostos com sub-VOs aninhados." | `deepImmutable` recursivo implementado em L44-50; testado em estrutura aninhada de 3 níveis + array + objetos dentro de array | ✅ |
| **CONSIDER B§5** (L937): "`Object.isFrozen()` em property-based tests confirmando invariante de imutabilidade." | `Object.isFrozen` usado em 9 `it`'s do test file | ✅ |
| **Followup §5** (L215-259): snippet canônico endossado | Implementação L27 e L44-50 batem **caractere por caractere** com o snippet, exceto `immutable` consolidado em uma linha (reformat do Prettier — semântica idêntica) | ✅ |
| **Nota de naming** (L297-320): `immutable`/`deepImmutable` aceito | Nomes idênticos | ✅ |

---

## 3. Critérios de aceitação do ticket

| CA | Critério | Verificação | Status |
| :-- | :-- | :-- | :-- |
| CA-1 | Test falha antes do W1 | Fechado em W0 — `ERR_MODULE_NOT_FOUND` | ✅ (W0) |
| CA-2 | Assinaturas exatas do estado-alvo | `immutable.ts:27` — `<T extends object>(value: T): Readonly<T>` ✅; L44 — `<T>(value: T): T` ✅ | ✅ |
| CA-3 | `Object.isFrozen(immutable({}))` é `true` | Testado em "aceita objeto vazio" | ✅ |
| CA-4 | `Object.isFrozen(deepImmutable(<aninhado>))` em cada nível | 3 `it`'s separados (raiz, intermediário, profundo) | ✅ |
| CA-5 | `deepImmutable(<primitivo>)` retorna primitivo | 5 `it`'s (number, string, null, undefined, boolean) | ✅ |
| CA-6 | Tentativa de mutação em strict produz `TypeError` | 2 `it`'s (shallow + nested) | ✅ |
| CA-7 | `shared/index.ts` reexporta `immutable` + `deepImmutable` | `index.ts:8` — reexport canônico | ✅ |
| CA-8 | Zero `throw`, zero `class`, zero `any` no diff | Auditoria via grep — 0 hits | ✅ |
| CA-9 a CA-12 | typecheck + format + test + lint | Reservados para W3 | ⏭ |

---

## 4. Inspeção linha-a-linha

### 4.1 `src/shared/immutable.ts`

**L1-13 — Cabeçalho JSDoc do módulo.** Cita origem (entrevista 0001 §Bloco B) com referências literais às decisões DO §10, DON'T §5, CONSIDER §2 e ticket.

**L27 — `immutable`:**
```ts
export const immutable = <T extends object>(value: T): Readonly<T> => Object.freeze(value);
```
- `T extends object` previne uso indevido com primitivos (compile-time guard).
- Retorno `Readonly<T>` ata a invariante ao tipo.
- Sem cópia: preserva identidade.
- Reformatado em uma linha pelo Prettier; semântica idêntica ao snippet da entrevista.

**L44-50 — `deepImmutable`:**
```ts
export const deepImmutable = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') return value;
  for (const key of Object.keys(value)) {
    deepImmutable((value as Record<string, unknown>)[key]);
  }
  return Object.freeze(value);
};
```
- **L45 (guard):** cobre todos os 7 primitivos JS + `null`. `function` falha o `!== 'object'`, passa direto (não congelamos closures — correto).
- **L46-48 (recursão):** `for…of Object.keys` enumera own enumerable string keys. Arrays passam o guard e são congelados; índices enumerados como strings.
- **L47 (único `as`):** `value as Record<string, unknown>` — narrowing após guard explícito. **Não é violação:**
  - Arquivo em `src/shared/`, não em `src/modules/*/domain/` — facade de infraestrutura.
  - Padrão clássico de TS quando o type system não tem inferência para estreitar `T` arbitrário.
  - CLAUDE.md §"Sintaxe" admite `as` quando inevitável e documentado.
  - JSDoc L37-43 + W1 REPORT L43 documentam a decisão.
- **L48 (recursão pura):** sem capturar retorno — congelamento in-place. Post-order: cada nível interno é congelado antes do raiz.
- **L49 (congelamento do raiz):** TS aceita atribuir `Frozen<T>` a `T` por estrutura.

**Pontos sutis analisados:**

1. **Estruturas cíclicas** — limitação documentada no `000-request.md` §"Riscos" (VOs do domínio são acíclicos por construção).
2. **Funções como propriedade** — guard rejeita, passa sem congelar (correto).
3. **`bigint`/`symbol`** — falham guard, passam direto.
4. **Arrays** — `Object.keys([1,2,3])` retorna `['0','1','2']`; congelamento funciona.

### 4.2 `src/shared/index.ts`

```diff
 export { newUuid, isUuidV4 } from './id.ts';
+
+export { immutable, deepImmutable } from './immutable.ts';
```

L8: reexport canônico exato. Sem `type` (são funções). `.ts` extension.

### 4.3 `tests/shared/immutable.test.ts`

Revisado tangencialmente (criado em W0, validado em W1 com 20/20 verdes):

- 4 `describe` × 20 `it`, AAA explícito, zero `throw`/`class`/`any`/`let` reatribuído.
- 9 usos de `Object.isFrozen` confirmam invariante (atendendo CONSIDER B§5).
- 2 casts em `assert.throws` (L77, L189) são necessários — `as { readonly: string }` afrouxa `Readonly<{...}>` propositadamente para forçar a tentativa de mutação testada. Padrão correto.

---

## 5. Issues encontradas

**Nenhuma.** Round único.

---

## 6. Citações sustentando as decisões

- **CLAUDE.md raiz** §"Regras invariantes" → "Domínio puro": "`throw` proibido. Operações retornam `Result<T, E>`." — `immutable.ts` zero `throw`.
- **CLAUDE.md raiz** §"Imutabilidade absoluta": "`Readonly<>`, `readonly T[]`, `as const`." — `immutable` retorna `Readonly<T>`.
- **CLAUDE.md raiz** §"Sintaxe": "Se `as` for inevitável, comentar o porquê." — único cast L47 documentado.
- **CLAUDE.md raiz** §"Sintaxe / módulos": "Extensões `.ts` nos imports relativos." — honrado.
- **Entrevista 0001** Bloco B DO §10 (L862): facade `immutable()`/`deepImmutable()` — implementação literal.
- **Entrevista 0001** Bloco B DON'T §5 (L898): `Object.freeze` direto proibido — aparece apenas no facade.
- **Entrevista 0001** Bloco B CONSIDER §2 (L934): `deepImmutable` para VOs compostos — função criada e testada.
- **Entrevista 0001** Bloco B CONSIDER §5 (L937): `Object.isFrozen` em property-based — usado em 9 `it`'s.
- **Entrevista 0001** Pergunta B1-B3 followup §5 (L215-259): snippet canônico — implementação bate caractere a caractere (módulo reformat de uma linha).
- **W1 REPORT L43:** "este arquivo é uma facade de infraestrutura de domínio, não um agregado/VO" — decisão consciente sobre o único `as`.

---

## Veredito final

**APPROVED.** Diff alinhado integralmente com:

- **CLAUDE.md raiz** (regras invariantes, sintaxe NodeNext, anti-padrões).
- **Entrevista 0001 Bloco B** (DO §10, DON'T §5, CONSIDER §2 e §5, snippet canônico do followup §5).
- **8/8 CAs verificáveis em W2** (CA-1 a CA-8 ✅; CA-9 a CA-12 → W3).
- **Zero código adicionado além do mínimo para GREEN.**
- **20/20 tests** verdes no arquivo; **509/496/0/13** suite completa.

**Observação para W3:** o `as Record<string, unknown>` (L47) NÃO é `as any` — `@typescript-eslint/no-explicit-any` não dispara. Confirmar no W3.

→ **Pronto para W3 — Quality Gate.**
