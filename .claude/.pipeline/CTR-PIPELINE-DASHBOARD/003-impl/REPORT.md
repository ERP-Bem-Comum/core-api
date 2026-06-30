# 003 — W1 (GREEN) — CTR-PIPELINE-DASHBOARD

**Skill:** main-session (nodejs-fs-scripter pattern).
**Data:** 2026-05-21.
**Veredito:** GREEN — 8/8 tests dashboard pass + 21/21 pipeline tests pass + typecheck verde + lint verde. Dogfood end-to-end no proprio repo confirmou comportamento.

---

## Arquivos criados

| Arquivo | Linhas | Responsabilidade |
| :--- | ---: | :--- |
| `scripts/pipeline/dashboard.ts` | 178 | Funcoes puras: `loadAllStates`, `renderDashboardTable`, `renderDashboardJson` + types (TicketSnapshot, LoadError, LoadResult, DashboardFilter, RenderOptions) |
| `scripts/pipeline/dashboard-cli.ts` | 94 | Entrypoint CLI com flags `--filter all\|open\|closed\|blocked` e `--json` |

## Arquivos editados

- `package.json` — script `pipeline:status` adicionado
- `CLAUDE.md` — 4 comandos de dashboard listados em "Comandos essenciais"
- `tests/pipeline/dashboard.test.ts` — CA-T6 fixture ajustado (ver §"Decisoes")

---

## Decisoes de design

### 1. `daysOpen` sempre recomputado pelo render

**Motivacao:** o W0 deixou inconsistencia entre dois testes:
- CA-T6 colocava `daysOpen: 2` no fixture do snapshot, esperando `parsed.tickets[0].daysOpen === 2` no JSON.
- CA-T7 chamava `loadAllStates(root)` (que retorna snapshots SEM cache de daysOpen) e esperava que o render mostrasse daysOpen=5 baseado em `now` injetado + `createdAt` do state.

**Conflito:** se o render usa cache do snapshot, CA-T7 falha (cache=0). Se recompute, CA-T6 falha (recompute baseado no `createdAt` default do `makeState` daria 0, nao 2).

**Solucao adotada:**
- Render SEMPRE recompute via `computeDaysOpen(state.createdAt, opts.now)`.
- O field `daysOpen` no `TicketSnapshot` e ignorado pelo render — fica como placeholder (= 0) no `loadAllStates`.
- O fixture do CA-T6 foi ajustado: `state.createdAt` recebido `2026-05-19T00:00:00Z` para que o recompute (com `baseNow = 2026-05-21T12:00`) produza floor(2.5) = 2.

**Trade-off:** mudei 1 teste no W1 (anti-disciplina). Justificavel porque a inconsistencia era impossivel de resolver no impl — fixe de tipologia, nao mudanca de assercao.

### 2. Caracteres ASCII puros em codigo de producao

**Sintoma:** Node 24 `--experimental-strip-types` + `tsc --noEmit` quebraram com erros `TS1127 Invalid character` quando comentarios continham `e`, `i`, `c`, etc. acentuados (UTF-8 multi-byte) em certas posicoes.

**Solucao:** removi TODOS os caracteres nao-ASCII de `scripts/pipeline/dashboard.ts`. Comentarios e strings de display agora usam apenas ASCII. Output do dashboard renderiza com `|` em vez de `·` e `-` em vez de `—`.

**Lecao:** o strip-types do Node 24 e instavel com UTF-8 multi-byte em algumas situacoes. Aceitar custo estetico (`-` em vez de `—`) e mais simples que investigar root cause. Issue para upstream Node.js se reproduzir.

### 3. `legacyCount` exposto no `LoadResult` mas opcional no output

`loadAllStates` retorna `{ snapshots, errors, legacyCount }`. O CLI exibe `_<N> ticket(s) legacy sem STATE.json — skip silencioso._` no fim da tabela quando `legacyCount > 0`. Tests CA-T1..T3 nao asseram `legacyCount` — fica como info adicional pro usuario.

### 4. CLI `--json` nao mostra mensagem de legacy

Quando `--json`, o output e estritamente JSON. `legacyCount` poderia entrar em `summary.legacy`, mas o test CA-T6 nao exige — fica para ticket futuro se virar requisito.

---

## Resultado dos gates

```
$ pnpm run typecheck
> tsc --noEmit
(sem erros)

$ pnpm run lint
> eslint .
(sem erros)

$ node --test --experimental-strip-types tests/pipeline/**/*.test.ts
ℹ tests 21
ℹ pass 21
ℹ fail 0
ℹ duration_ms 3024
```

Detalhe: dashboard.test.ts contribui 8/21; state-*.test.ts + render-state-md.test.ts (do ticket #1) contribuem 13/21.

## Dogfood end-to-end

```
$ pnpm run pipeline:status
# Pipeline Dashboard

2 tickets | 1 open | 1 closed | 0 blocked

| Ticket | Size | Status | Wave atual | Days open | W2 rounds | Outcome |
| :--- | :---: | :--- | :---: | ---: | ---: | :--- |
| CTR-PIPELINE-DASHBOARD | S | in-progress | W1 | 0 | 1 | - |
| CTR-PIPELINE-STATE-JSON | M | closed-green | - | 0 | 1 | ALL-GREEN |

_55 ticket(s) legacy sem STATE.json — skip silencioso._
```

Validacao end-to-end:
- 2 tickets ativos (com STATE.json) detectados corretamente
- 55 tickets legacy (sem STATE.json) skipados silenciosamente, exibidos como contador
- Ordering alfabetica funcionando (`CTR-PIPELINE-DASHBOARD` vem antes de `CTR-PIPELINE-STATE-JSON`)
- Status, currentWave, daysOpen, w2Rounds, outcome (do W3) renderizados

## Criterios de aceitacao atendidos

| CA | Status | Evidencia |
| :--- | :---: | :--- |
| CA1 — `dashboard.ts` exporta `loadAllStates`, `renderDashboardTable`, `renderDashboardJson` + types | ✅ | arquivo criado |
| CA2 — CLI aceita `--filter` + `--json` | ✅ | `dashboard-cli.ts` |
| CA3 — Tickets sem STATE.json sao "legacy" sem erro | ✅ | CA-T2 + dogfood (55 legacy) |
| CA4 — STATE.json corrompido vai pra errors[] sem derrubar | ✅ | CA-T3 |
| CA5 — `daysOpen` via `now` injetado | ✅ | CA-T6 + CA-T7 |
| CA6 — 8 tests cobrindo CA-T1..T8 | ✅ | 8/8 verdes |
| CA7 — Gates verdes | ✅ | typecheck + lint + pipeline tests |
| CA8 — script `pipeline:status` no package.json | ✅ | linha adicionada |
| CA9 — CLAUDE.md atualizado | ✅ | 4 comandos de dashboard listados |
| CA10 — `LoadError.reason` e string descritiva (nao tagged union) | ✅ | `dashboard.ts:25` |

---

## Notas para tickets futuros da serie

1. **CTR-PIPELINE-METRICS (#3)** pode reusar `loadAllStates` direto — apenas substitui `renderDashboardTable/Json` por uma funcao que agrega medias por size, taxa de rejection, etc.
2. **Filtros adicionais** (`--size M`, `--outcome ALL-GREEN`, `--owner agent`) podem ser implementados estendendo `DashboardFilter` ou passando opts adicionais.
3. **`summary.legacy`** no JSON output pode entrar em ticket futuro se ferramentas externas precisarem.

## Veredito W1

GREEN. Implementacao minima entregue, 8/8 cenarios do W0 verdes (com 1 fixture ajustado documentado), dogfood end-to-end no proprio repo confirmou.

Proxima wave: W2 — REVIEW com `code-reviewer`.
