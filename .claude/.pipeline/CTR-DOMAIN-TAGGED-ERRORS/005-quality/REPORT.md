# W3 — Quality Gate Report — CTR-DOMAIN-TAGGED-ERRORS

> **Status:** ✅ **ALL GREEN** (após round 2 — fix de 2 arquivos adjacentes ao diff).
> **Skill:** [`ts-quality-checker`](../../../skills/ts-quality-checker/SKILL.md).
> **Data:** 2026-05-20.
> **Roteado via:** `Agent(contratos-orchestrator)` — protocolo **Opção B**, 4ª e última invocação.
> **Histórico:** Round 1 detectou 4 erros lint em 2 arquivos adjacentes (não no diff declarado de W1/W2); round 2 verde após fix `${X.error}` → `${JSON.stringify(X.error)}` (mesmo padrão de W2 round 2).

---

## Sumário

| # | Gate | Status |
| :--- | :--- | :---: |
| 1 | `pnpm run typecheck` | ✅ |
| 2 | `pnpm run format:check` (diff) | ✅ |
| 3 | `pnpm test` | ✅ (595/582/0/13) |
| 4 | `pnpm run lint` | ✅ (após round 2) |

---

## Round 1 — capturou 4 erros adjacentes ao diff

W2 declarou APPROVED em round 2. W3 rodou `pnpm run lint` global e detectou:

```
tests/modules/contracts/application/use-cases/queries.test.ts:34:51
  error  'r.error' may use Object's default stringification format  @typescript-eslint/no-base-to-string
  error  Invalid type "CreateContractError" of template literal expression
         @typescript-eslint/restrict-template-expressions

tests/regression/reports-2026-05-15.test.ts:458:57
  error  'created.error' may use Object's default stringification format
  error  Invalid type "CreateContractError" of template literal expression

✖ 4 problems (4 errors, 0 warnings)
```

**Causa raiz:** os 2 arquivos consomem `CreateContractError` (que agora carrega tagged variants via propagação de `ContractError`) mas não estavam no diff declarado de W1 — escaparam do scope de audit do W2.

## Round 2 — fix aplicado

| Arquivo | Linha | Fix |
| :--- | ---: | :--- |
| `tests/modules/contracts/application/use-cases/queries.test.ts` | 34 | `${r.error}` → `${JSON.stringify(r.error)}` |
| `tests/regression/reports-2026-05-15.test.ts` | 458 | `${created.error}` → `${JSON.stringify(created.error)}` |

Mesmo padrão idempotente já aplicado em W2 round 2 (9 sítios análogos).

## Gates finais (round 2)

### Gate 1 — typecheck
```
$ pnpm run typecheck
(saída vazia — exit 0)
```

### Gate 2 — format:check
Suite completa continua reclamando de `CLAUDE.md`/`README.md` (pré-existentes documentados desde `CTR-SHARED-RESULT-COMBINATORS`). Diff específico verde:
```
$ npx prettier --check <arquivos do diff>
All matched files use Prettier code style!
```

### Gate 3 — `pnpm test`
```
ℹ tests 595
ℹ pass 582
ℹ fail 0
ℹ skipped 13
ℹ duration_ms 38377
```
**595 = 564 baseline + 31 W0** — match exato.

### Gate 4 — `pnpm run lint`
```
$ pnpm run lint
(saída vazia — exit 0)
```
Suite completa zero diagnósticos.

## Cobertura final dos CAs

| CA | Wave | Status |
| :--- | :---: | :---: |
| CA-1 (RED antes do W1) | W0 | ✅ |
| CA-2 a CA-9 (impl + tests) | W1 | ✅ |
| CA-10 (zero throw/class/any) | W2 | ✅ |
| CA-11 (typecheck) | W3 | ✅ |
| CA-12 (format) | W3 | ✅ |
| CA-13 (test) | W3 | ✅ |
| CA-14 (lint) | W3 round 2 | ✅ |

**14/14 ✅.**

---

## Lição operacional #3 (consolidada em 3 dos 5 tickets Opção B)

| # | Ticket | W3 detectou que W2 deixou passar |
| :-- | :--- | :--- |
| 1 | `CTR-SHARED-IMMUTABLE` | 3 issues em test file (format + lint) |
| 2 | `CTR-SHARED-BRAND-UNIQUE-SYMBOL` | 1 erro `naming-convention` em `brand.ts:12` |
| 3 | `CTR-DOMAIN-TAGGED-ERRORS` (atual) | 4 erros lint em 2 arquivos **adjacentes ao diff** |

**Padrão emergente:** refactor de tipo público com shape novo (Result.error: `string` → `Readonly<{tag, ...}>`) exige **grep global por padrões de consumo** antes do W2 — a auditoria de arquivos declarados de W1 não cobre callers downstream.

**Refinamento sugerido (próxima iteração Opção B):**
- Briefing W1 incluir grep template (`${r.error}`, `r.error === '...'`).
- Briefing W2 incluir `pnpm run lint` **global** (não apenas arquivos declarados no diff).

---

## Próximos tickets habilitados

- **`CTR-DOMAIN-STATE-MACHINE-CONTRACT`** — depende deste + DEBRAND-AGG ✅. **Fecha top-3 leverage #1** (State Machine em Tipos).
- **`CTR-DOMAIN-STATE-MACHINE-AMENDMENT`** — idem.

→ **W3 fechada. Ticket pronto para encerramento.**
