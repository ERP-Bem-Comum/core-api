# 003 — W1 (GREEN) — CTR-PIPELINE-STATE-JSON

**Skill:** `nodejs-fs-scripter` + `ts-domain-modeler` (executados na main session, YAGNI estrito).
**Data:** 2026-05-21.
**Veredito:** ✅ **GREEN** — 13/13 tests pass, `pnpm run typecheck` ok, `pnpm run lint -- scripts/pipeline tests/pipeline` ok. Dogfood concluído: este ticket emitiu o primeiro `STATE.json` do repositório, e `STATE.md` foi regenerado via `pnpm run pipeline:state render CTR-PIPELINE-STATE-JSON`.

---

## Arquivos criados

| Arquivo | Linhas | Responsabilidade |
| :--- | ---: | :--- |
| `scripts/pipeline/state-schema.ts` | 95 | Types canônicos (`PipelineState`, `WaveEntry`, etc.) + `parsePipelineState` retornando `Result<PipelineState, ParseError>` com 4 tags de erro. |
| `scripts/pipeline/state-io.ts` | 82 | `readState` / `writeState` com atomic IO (tmpfile + rename). Aceita `WriteStateOptions` (DI explícita) para testabilidade. |
| `scripts/pipeline/render-state-md.ts` | 50 | Render determinístico `PipelineState → string` em Markdown compatível com `inject-ticket-context.sh`. |
| `scripts/pipeline/state-cli.ts` | 326 | CLI com 6 comandos: `init`, `wave-start`, `wave-finish`, `wave-round`, `close`, `render`. Exit codes 0/1/2 conforme spec. |

## Arquivos editados

- `package.json` — adicionado script `"pipeline:state": "node --experimental-strip-types --no-warnings scripts/pipeline/state-cli.ts"`.
- `CLAUDE.md` — estrutura do ticket inclui `STATE.json` (canônico) e `STATE.md` (gerado); seção "Comandos essenciais" lista os 6 subcomandos.

---

## Decisões de design

### 1. `WriteStateOptions` (DI explícita) substituiu a constraint W0 de namespace import

**O que mudou:** O W0 exigia `import * as fsp from 'node:fs/promises'` + `fsp.rename(...)` para o test CA-T5b mockar via `t.mock.method(fsp, 'rename', ...)`.

**Por que mudei:** Ao executar W0, o `t.mock.method` falhou com `TypeError: Cannot redefine property: rename` — `node:fs/promises` expõe `rename` como `configurable: false`, então mocks via Object.defineProperty falham.

**Solução adotada:** `writeState` aceita 3º arg opcional `WriteStateOptions = { writeFile?, rename?, unlink? }`. Em produção, callers usam a função sem opts (default `fsp.real`). Em testes, injetam funções que lançam para validar atomicidade. Resultado: CA-T5b passou sem hack frágil.

**Constraint do W0 atualizada:** namespace import deixou de ser obrigatório no `state-io.ts` — virou puramente convenção. O test `state-io.test.ts` CA-T5b foi adaptado para usar `opts.rename`.

### 2. `function exitFail` em vez de arrow function

**O que mudou:** Primeiro draft do CLI tinha `const exitFail = (code, msg): never => {...}`. TS reclamou que `ticket` continuava `string | undefined` mesmo após `if (ticket === undefined) exitFail(...)`.

**Por quê:** TS narrowing é conservador com arrow funcs declaradas em escopo aninhado — não infere `never` corretamente. Converter para `function exitFail()` resolveu — TypeScript reconhece `function` declarations com `: never` como abort points e narrowa corretamente.

**Solução:** `function exitFail(code, msg): never { ... }`. Onde TS ainda não narrowava (no `main`, com `subcommand`/`ticket` da deconstruction), inlinei `process.stderr.write(...); process.exit(N);` direto — `process.exit` é `never` em `@types/node` e narrowa imediatamente.

### 3. Helpers `readRaw` / `tryParseJson` para satisfazer `init-declarations`

**Motivo:** ESLint config do projeto (typescript-eslint strict) tem `init-declarations: error`. Padrão `let raw; try { raw = await ... }` viola a regra (declaração sem init).

**Solução:** Extrair o try/catch em helper que retorna `Result<T, E>`. Padrão mais limpo, evita `let` mutável, e estende o uso canônico de `Result<T, E>` do projeto.

### 4. STATE.md gerado vs custom

**Dilema:** Este ticket começou com `STATE.md` escrito à mão (com notas, próximo passo, escopo congelado). Ao dogfoodar, `pipeline:state render` sobrescreveu o conteúdo custom pelo render determinístico mínimo.

**Decisão:** Aceitar a sobrescrita. As notas custom (que existiam apenas no `STATE.md` inicial) já estão duplicadas no `000-request.md` e neste REPORT. O ganho de "STATE.md sempre = `render(STATE.json)`" supera a perda de notas livres. **Para tickets futuros:** notas vivem no `000-request.md` e nos REPORTs; `STATE.md` é só dashboard.

---

## Resultado dos gates

```
$ pnpm run typecheck
> tsc --noEmit
(sem erros)

$ node --test --experimental-strip-types --no-warnings 'tests/pipeline/**/*.test.ts'
✔ parsePipelineState — schema v1 (4 tests)
✔ writeState / readState — atomic IO (2 tests)
✔ renderStateMd — determinismo e compat com hook (2 tests)
✔ state-cli — comandos CLI (5 tests)
ℹ tests 13
ℹ pass 13
ℹ fail 0
ℹ duration_ms 2352.47

$ pnpm run lint -- scripts/pipeline tests/pipeline
(sem erros)
```

## Dogfood

```
$ pnpm run pipeline:state render CTR-PIPELINE-STATE-JSON
rendered: CTR-PIPELINE-STATE-JSON
```

Resultado: `.claude/.pipeline/CTR-PIPELINE-STATE-JSON/STATE.json` (canônico) +
`STATE.md` regenerado a partir dele.

```markdown
# Estado do Ticket CTR-PIPELINE-STATE-JSON

> **Size:** M · **Status:** in-progress · **Created:** 2026-05-21T08:00:00.000Z

| Wave | Status | Skill | REPORT | Última atualização |
| :--- | :--- | :--- | :--- | :--- |
| W0 | done (RED) | tdd-strategist | 002-tests/REPORT.md | 2026-05-21T08:30:00.000Z |
| W1 | done (GREEN) | main-session (nodejs-fs-scripter + ts-domain-modeler) | 003-impl/REPORT.md | 2026-05-21T09:30:00.000Z |
| W2 | pending | — | — | — |
| W3 | pending | — | — | — |

## Último evento

W1 GREEN — 13/13 tests pass, typecheck + lint verdes
```

---

## Critérios de aceitação atendidos

| CA | Status | Evidência |
| :--- | :---: | :--- |
| **CA1** — `state-schema.ts` com `PipelineState`, `WaveEntry`, `parsePipelineState`, 4 erro tags | ✅ | `scripts/pipeline/state-schema.ts` |
| **CA2** — `STATE.json` deste ticket gerado; `STATE.md` derivado | ✅ | `pnpm run pipeline:state render CTR-PIPELINE-STATE-JSON` |
| **CA3** — `writeState` atômico (tmpfile + rename) | ✅ | CA-T5a + CA-T5b |
| **CA4** — `renderStateMd` determinístico + compat com hook | ✅ | CA-T6 + CA-T7 |
| **CA5** — CLI com 6 subcomandos | ✅ | `state-cli.ts` |
| **CA6** — Tickets legados continuam funcionais | ✅ | `state-cli.ts` falha graciosamente com `ReadFileFailed` quando `STATE.json` ausente |
| **CA7** — Mínimo 12 tests cobrindo CA-T1..T12 | ✅ | 13 tests (T5 desdobrado em T5a/T5b) |
| **CA8** — Gates verdes | ✅ | typecheck + lint + test (13/13) |
| **CA9** — `CLAUDE.md` atualizado | ✅ | seção Pipeline + Comandos essenciais |
| **CA10** — Tagged errors (Padrão D) | ✅ | `ParseError`, `ReadError`, `WriteError` todos com `tag:` discriminante |

---

## Notas / lições para próximos tickets da série

1. **`t.mock.method` não funciona em módulos nativos** (`node:fs/promises`, `node:path`, etc.) — propriedades `configurable: false`. Para mockar IO, use **DI explícita** via opts opcional ou `t.mock.module()` (experimental, requer flag).

2. **`function` > arrow para helpers `never`.** TypeScript narrowing é mais agressivo com `function` declarations. Para helpers de abort/exit, prefira `function`.

3. **`init-declarations` rule.** Evite `let x; try { x = ... } catch { ... }`. Refatore para helper que retorna `Result<T, E>`.

4. **STATE.md gerado é incompatível com notas custom.** Mantenha tudo que for narrativa em `000-request.md` ou REPORTs — `STATE.md` é dashboard apenas.

5. **Dogfood funciona.** O CLI conseguiu render o próprio ticket. Validação end-to-end do design.

---

## Veredito W1

✅ **GREEN confirmado.** Implementação mínima entregue, todos os testes RED do W0 agora verdes. STATE.json deste ticket emitido com sucesso (dogfood ✅). CLAUDE.md documentado.

Próxima wave: **W2 — REVIEW** com `code-reviewer` em modo read-only.
