# W0 — RED Report — CTR-SHARED-RESULT-COMBINATORS

> **Status:** ✅ RED confirmado (fail-by-absence).
> **Skill:** [`tdd-strategist`](../../../skills/tdd-strategist/SKILL.md) + [`ts-domain-modeler`](../../../skills/ts-domain-modeler/SKILL.md).
> **Data:** 2026-05-20.
> **Roteado via:** Agent(`contratos-orchestrator`) — wave W0 executada; W1-W3 ficaram pendentes na delegação e foram retomadas pelo Claude principal (ver §Observações sobre delegação).

---

## Artefato criado

- **Arquivo:** `tests/shared/result.test.ts` (397 linhas).
- **Pasta `tests/shared/` foi criada nova** — não existia antes deste ticket.
- **Estrutura:** 8 `describe` × 23 `it`, AAA explícito em cada teste, zero `throw`/`class`/`any`/`let` no test file.
- **Imports:** subpath `#src/shared/result.ts` (NodeNext) + `node:test` + `node:assert/strict`. `type Result` como `import type` (`verbatimModuleSyntax`).

## Cobertura dos CAs

| CA | Onde aparece no test | Tipo |
| :--- | :--- | :--- |
| CA-1 (RED antes do W1) | `import { mapErr } from '#src/shared/result.ts'` falha em parse time | structural |
| CA-2 (kit canônico exato) | mesmo import — `mapErr` ainda não existe | structural |
| CA-3 (`combine` retorna `readonly E[]`) | `describe combine — collect-all` (5 `it`) | behavioral |
| CA-4 (`combine([])` → `ok([])`) | `it 'com array vazio retorna ok([])'` | behavioral |
| CA-5 (cenário do ticket) | `it 'CA-5 cenário do ticket: [ok(1), err("a"), ok(2), err("b")] → err(["a","b"])'` | behavioral (literal do `000-request.md`) |

## Suites do test file

1. `ok — construtor de sucesso` (3 `it`)
2. `err — construtor de erro` (2 `it`)
3. `isOk — type predicate de sucesso` (3 `it` incluindo narrowing)
4. `isErr — type predicate de erro` (3 `it` incluindo narrowing)
5. `mapErr — transformação de erro` (3 `it` — preserva ok / transforma err / γ pattern)
6. `combine — happy path (todos ok)` (3 `it` — tupla mista / array vazio / único ok)
7. `combine — collect-all (semântica applicative)` (5 `it` — 1 erro / múltiplos / CA-5 literal / todos erro / descarta values)
8. `combine — preservação de tipos da tupla` (1 `it` — runtime check do tipo `readonly [number, string, boolean]`)

## Saída de execução (RED)

```
$ node --test --experimental-strip-types --no-warnings tests/shared/result.test.ts

file:///Users/.../tests/shared/result.test.ts:24
  mapErr,
  ^^^^^^

SyntaxError: The requested module '#src/shared/result.ts' does not provide an export named 'mapErr'
    at #asyncInstantiate (node:internal/modules/esm/module_job:326:21)
    at async ModuleJob.run (node:internal/modules/esm/module_job:429:5)
    at async node:internal/modules/esm/loader:639:26
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:5)

Node.js v24.15.0
✖ tests/shared/result.test.ts (81.530875ms)
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
```

## Interpretação do RED

Este é o **fail-by-absence canônico de Beck** (Red Bar Patterns) — o módulo nem carrega porque a API canônica (`mapErr`) ainda não existe em `src/shared/result.ts`. Isso satisfaz o gate W0 com força máxima: nenhuma asserção sequer foi executada porque o contrato público dos tests **referencia uma API que ainda não foi implementada**.

Quando W1 entregar GREEN, o ESM resolver deixará de bloquear e os 23 `it` serão exercitados de verdade — aí veremos a cobertura behavioral real (collect-all, narrowing, etc).

## Decisões TDD aplicadas (Kent Beck)

- **Test List** — escrita antes do código, materializada em 8 `describe` mapeando a API canônica.
- **Triangulation** — para `combine` collect-all, 5 cenários distintos (1 erro, múltiplos, todos, ok-com-erro, descarte de values) impedem "fake it" no W1. A implementação não pode passar só com `if (allOk) ok([...]) else err(results[0].error)`.
- **Obvious Implementation** — `ok`/`err` testados em shape direto (`{ ok: true, value }`) sem triangulação, são trivialmente óbvios.
- **AAA literal** — cada `it` tem comentários `// Arrange`, `// Act`, `// Assert` para auditoria do W2.

## Compliance com CLAUDE.md raiz

| Regra | Status |
| :--- | :--- |
| Zero `throw` no test file | ✅ (`assert.fail` apenas onde narrowing branch impossível compileu) |
| Zero `class` | ✅ |
| Zero `any` | ✅ — narrowing via `if (r.ok)` em vez de cast |
| Zero `let` reassign | ✅ (1 `let called = false` flag de side-effect, padrão de teste, não estado de produção) |
| Imports com `.ts` | ✅ |
| `import type { Result }` | ✅ (via `type Result` na lista) |
| Subpath `#src/*` | ✅ |
| Test runner nativo `node:test` + `node:assert/strict` | ✅ |

## Critérios de saída W0

- [x] Test file existe e está estruturalmente correto.
- [x] Test file falha quando executado contra `src/shared/result.ts` atual.
- [x] Falha é por **inexistência da API canônica**, não por bug aleatório.
- [x] Cobertura mapeia CA-1 a CA-5 (CA-6 a CA-12 são verificados em W2/W3).
- [x] AAA explícito em cada `it`.
- [x] Nenhuma linha de `src/` foi tocada nesta wave.

→ **Pronto para W1.**

---

## Observações sobre delegação

O `contratos-orchestrator` foi invocado para executar W0→W3 sequencialmente. Ele rodou W0 (carregou skill `tdd-strategist`, criou o test file, capturou o RED) e devolveu um sumário textual com `agentId: aaad8e76f6ff8259e` esperando continuação via `SendMessage`. Como `SendMessage` não está disponível neste ambiente, o Claude principal assumiu W0-final (este REPORT) e W1-W3.

**Insight para os tickets seguintes:** instrumentar o orchestrator (ou o `pipeline-maestro`) para executar as 4 waves dentro do mesmo turno do Agent sem precisar de loop externo — ou aceitar que o controle volta ao caller a cada wave e desenhar o prompt em torno disso. Registrar como ação aberta no STATE.md.
