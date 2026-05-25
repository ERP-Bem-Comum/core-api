# W3 — Quality Gate Report — CTR-SHARED-BRAND-UNIQUE-SYMBOL

> **Skill:** [`ts-quality-checker`](../../../skills/ts-quality-checker/SKILL.md).
> **Data:** 2026-05-20.
> **Roteado via:** `Agent(contratos-orchestrator)` — protocolo **Opção B**, 4ª de 4 invocações.
> **Histórico:** Round 1 capturou bloqueio em CA-13 (lint). Round 2 verde após fix cirúrgico em `src/shared/brand.ts:12` (eslint-disable + justificativa). Veredito final = ✅ verde no round 2.

---

## Round 1 — ❌ BLOCKED (preservado para auditoria)

### Gates round 1

| # | Gate | Status | CA |
| :-- | :--- | :---: | :--- |
| 1 | `pnpm run typecheck` | ✅ | CA-10 |
| 2 | `pnpm run format:check` (arquivos do ticket) | ✅ | CA-11 (warnings em docs raiz pré-existentes, não-bloqueantes) |
| 3 | `pnpm test` | ✅ | CA-12 (521/508/0/13) |
| 4 | `pnpm run lint` (arquivos do ticket) | ❌ | CA-13 |

### Diagnóstico round 1

```
$ npx eslint src/shared/brand.ts src/shared/index.ts tests/shared/brand.test.ts

/Users/.../src/shared/brand.ts
  12:15  error  Variable name `__brand` trimmed as `_brand` must match one of
                the following formats: camelCase, UPPER_CASE, PascalCase
                @typescript-eslint/naming-convention

✖ 1 problem (1 error, 0 warnings)
```

### Causa

A regra `@typescript-eslint/naming-convention` no `eslint.config.js:167-198` aplica selector `variable` com `leadingUnderscore: 'allow'` (singular). Comportamento da regra: trim **um** underscore principal antes de checar formato. Para `__brand`:

1. Trim de `_` → restante `_brand`.
2. `_brand` ainda tem leading underscore → reprovado contra `camelCase`/`UPPER_CASE`/`PascalCase`.

A W2 inferiu (incorretamente) que `leadingUnderscore: 'allow'` cobria identifiers com duplo underscore. Inferência sem execução do lint deixou passar.

### Opções de fix avaliadas

| Opção | Mudança | Blast radius | Veredito |
| :--- | :--- | :--- | :---: |
| A — `'allowDouble'` na config | Editar `eslint.config.js:178` | Global (afeta todos `__x`) | Adiada |
| **B — inline disable + justificativa** | `// eslint-disable-next-line` cirúrgico | Nulo (1 linha) | ✅ aplicada |
| C — renomear `__brand` → `brand` | Perde nome canônico da entrevista §6 | Nulo | Rejeitada |

**Razão da escolha B:** o nome `__brand` é **prescrito literalmente** pela entrevista 0001 followup §6 (linha 269). Cirúrgico preserva a decisão canônica sem ampliar regra global; se outros brand symbols surgirem, abre-se ticket dedicado pra avaliar A.

---

## Round 2 — ✅ VERDE

### Correção aplicada (não-código de produção stricto sensu — comentário + disable)

`src/shared/brand.ts:12-17`:
```ts
// Nome canônico `__brand` é prescrito literalmente pela entrevista 0001 §6 (followup
// L261-294) como pattern idiomático TS para brand symbols. O `naming-convention` da
// flat config aceita 1 leading underscore (`leadingUnderscore: 'allow'`), não 2 —
// disable cirúrgico aqui é mais conservador que ampliar a regra globalmente.
// eslint-disable-next-line @typescript-eslint/naming-convention
declare const __brand: unique symbol;
```

### Gate 1 — `pnpm run typecheck`

```
$ pnpm run typecheck

> core-api@0.1.0 typecheck
> tsc --noEmit

(saída vazia — exit 0)
```

✅ **PASS** — CA-10.

### Gate 2 — `pnpm run format:check` (arquivos do ticket)

```
$ npx prettier --check \
    src/shared/brand.ts \
    src/shared/index.ts \
    tests/shared/brand.test.ts

All matched files use Prettier code style!
```

Suite completa continua reclamando de `CLAUDE.md`/`README.md` — pré-existentes documentados.

✅ **PASS** — CA-11.

### Gate 3 — `pnpm test`

```
ℹ tests 521
ℹ suites 174
ℹ pass 508
ℹ fail 0
ℹ skipped 13
ℹ duration_ms 38057.779084
```

521 = 509 (baseline pós CTR-SHARED-IMMUTABLE) + 12 novos do `brand.test.ts`. Conferência exata.

✅ **PASS** — CA-12.

### Gate 4 — `pnpm run lint` (arquivos do ticket)

```
$ npx eslint src/shared/brand.ts src/shared/index.ts tests/shared/brand.test.ts

(saída vazia — exit 0)
```

✅ **PASS** — CA-13.

---

## Cobertura final dos critérios de aceitação

| CA | Critério | Wave | Status |
| :-- | :-- | :-- | :-- |
| CA-1 | Test file falha antes do W1 | W0 | ✅ |
| CA-2 | `brand.ts` exporta `Brand` e `BrandOf` com assinaturas exatas | W1 | ✅ |
| CA-3 | Símbolo interno renomeado para `__brand` | W1 | ✅ |
| CA-4 | Type param renomeado `Tag → K` | W1 | ✅ |
| CA-5 | `BrandOf<Brand<*, K>>` extrai `K` (3/3 it) | W1 | ✅ |
| CA-6 | `BrandOf<não-brandado>` é `never` (3/3 it) | W1 | ✅ |
| CA-7 | 10 sítios consumidores compilam | W1 (typecheck) | ✅ |
| CA-8 | `shared/index.ts` reexporta `BrandOf` | W2 | ✅ |
| CA-9 | Zero `throw`, `class`, `any` no diff | W2 | ✅ |
| CA-10 | `pnpm run typecheck` verde | W3 | ✅ |
| CA-11 | `pnpm run format:check` verde nos arquivos do ticket | W3 | ✅ |
| CA-12 | `pnpm test` verde | W3 | ✅ |
| CA-13 | `pnpm run lint` verde nos arquivos do ticket | W3 round 2 | ✅ |

**13/13 ✅.**

---

## Lições aprendidas (consolidação)

1. **Auditoria visual ≠ execução.** A W2 fez auditoria detalhada do ESLint config (inclusive linha 178), mas inferiu cobertura sem rodar lint. **W2 deve executar typecheck + lint específicos dos arquivos do diff** quando o briefing exigir rigor anti-tangencial. Caso contrário, segue valendo o invariante "W3 é a fonte de verdade final".
2. **`unique symbol` com `__x`:** pattern idiomático em TS, mas exige `leadingUnderscore: 'allowDouble'` (não `'allow'`). Documentar isso no CLAUDE.md raiz ou em ticket de SKILL-REFRESH.
3. **Confirmação do invariante "W3 read-only":** detecção do erro nesta wave É o papel do gate final. O Agent W3 foi rigoroso e me apresentou as 3 opções de fix sem agir — exatamente o que se espera de skill read-only.

---

## Próximos tickets habilitados

| Ticket | Tipo | Justificativa |
| :--- | :--- | :--- |
| **`CTR-SHARED-VO-CANONICAL`** | dependente (top-3 #2 fecha) | Dependências `CTR-SHARED-IMMUTABLE` ✅ + `CTR-SHARED-BRAND-UNIQUE-SYMBOL` ✅ ambas verdes. Top-3 #2 ("Parse, don't validate") finaliza. |
| `CTR-DOMAIN-DEBRAND-AGG` | folha (paralelo) | Destrava `TAGGED-ERRORS` → top-3 #1. |
| `CTR-DOMAIN-COMPOSE-REFACTOR` | dependente | Consumidor de `combine`+`mapErr`. Top-3 #3 fecha. |

---

## Avaliação do protocolo Opção B (4 invocações)

| # | Invocação | Wave | Encerrou limpamente? | Detectou problemas? |
| :--- | :--- | :--- | :--- | :--- |
| 1 | `Agent(contratos-orchestrator)` | W0 — RED | ✅ | RED via tsc (descoberta de runtime: `--experimental-strip-types` ignora typecheck) |
| 2 | `Agent(contratos-orchestrator)` | W1 — GREEN | ✅ | GREEN + suite +12 |
| 3 | `Agent(contratos-orchestrator)` | W2 — REVIEW | ✅ | APPROVED com auditoria anti-tangencial real do test file |
| 4 | `Agent(contratos-orchestrator)` | W3 — QUALITY | ✅ | **BLOCKED detectado** (lint em `brand.ts:12`) |

**Veredito do protocolo:** **operacional e bem-sucedido pela segunda vez consecutiva.** O fail-first funcionou — W3 pegou exatamente o tipo de coisa que W2 não pega sem executar.
