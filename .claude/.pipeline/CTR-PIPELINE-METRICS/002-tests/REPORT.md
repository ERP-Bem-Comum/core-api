# 002 - W0 (RED) - CTR-PIPELINE-METRICS

**Skill:** tdd-strategist
**Data:** 2026-05-21
**Veredito:** RED CONFIRMADO - `pass=0, fail=1` (top-level import quebra; `scripts/pipeline/metrics.ts` nao existe).

---

## Arquivos criados

| Arquivo | Cenarios | CA cobertos |
| :--- | ---: | :--- |
| `tests/pipeline/metrics.test.ts` | 8 | CA-T1..T8 |

---

## Intencao de cada teste

### `computeMetrics` - shape e empty input

- **CA-T1**: `computeMetrics([])` retorna shape valido com TUDO zerado:
  - `total=0`, `byStatus.*=0`, `bySize.*=0`, `w2Rounds.count=0`,
    `totalDuration.count=0`, `topAgents=[]`, `rejectionRate=0`.
  - **Critico:** valida que nao lanca em input vazio e nao divide por zero.

### `computeMetrics` - agregacao

- **CA-T2 (byStatus)**: 3 snapshots (1 open, 1 closed-green, 1 closed-rejected) -> `byStatus = {open: 1, closedGreen: 1, closedRejected: 1, inProgress: 0, blocked: 0}`.
- **CA-T3 (bySize)**: 4 snapshots (1 XS, 2 S, 1 M) -> `bySize = {XS:1, S:2, M:1, L:0, XL:0}`.

### `computeMetrics` - W2 rounds

- **CA-T4**: 3 W2 done com `rounds = 1, 2, 3` -> `avg=2.0`, `round1Only=1`, `round2=1`, `round3=1`, `count=3`. **Tickets sem W2 done sao ignorados nas estatisticas de W2.**

### `computeMetrics` - totalDuration

- **CA-T5**: 2 closed-green com durations 3 e 7 dias (calculados de `createdAt + closedAt`) -> `avgDays=5, minDays=3, maxDays=7, medianDays=5, count=2`. **Ticket open NAO entra na agregacao** (assertion explicita no test).

### `computeMetrics` - topAgents

- **CA-T6**: 2 tickets com:
  - `CTR-A`: W0=tdd-strategist, W2=code-reviewer
  - `CTR-B`: W0=tdd-strategist
  - Resultado: `topAgents[0] = {agent: 'tdd-strategist', count: 2}`, `topAgents[1] = {agent: 'code-reviewer', count: 1}`.
  - **Ordering por count DESC.**

### `computeMetrics` - rejectionRate

- **CA-T7**: 4 W2 done (2 com rounds=1, 2 com rounds>1) -> `rejectionRate = 0.5`. **E** `computeMetrics([]).rejectionRate === 0` (proteção contra divisao por zero documentada).

### CLI E2E - `metrics-cli.ts`

- **CA-T8**: cria `tmpdir/<rand>/.claude/.pipeline/CTR-FIXTURE/STATE.json` (ticket closed-green); roda `node metrics-cli.ts --json` com `cwd = tmpdir/<rand>` -> exit 0, stdout parseavel, `total=1`, `byStatus.closedGreen=1`. Adicionalmente verifica que `renderMetricsJson(computeMetrics([state]))` produz output equivalente diretamente (uso programatico).

---

## Saida do runner

```
ℹ tests 1
ℹ suites 0
ℹ pass 0
ℹ fail 1
ℹ duration_ms 167.34
```

Erro top-level: import falha porque `scripts/pipeline/metrics.ts` nao existe.

**Por que `tests=1` e nao 8:** mesmo padrao dos tickets #1 e #2. O `node:test` reporta o arquivo inteiro como 1 fail unitario quando o `import` top-level quebra. Em W1, os 8 cenarios virao a tona individualmente.

---

## Constraints e decisoes herdadas para W1

1. **`computeMetrics([])` retorna shape valido (nao lanca, sem divisao por zero).** CA-T1 + CA-T7 cobrem.

2. **`computeMetrics` retorna `PipelineMetrics`** com fields exatos:
   - `total: number`
   - `byStatus: { open, inProgress, closedGreen, closedRejected, blocked }` (numbers)
   - `bySize: { XS, S, M, L, XL }` (numbers)
   - `w2Rounds: { count, avg, round1Only, round2, round3 }`
   - `totalDuration: { count, avgDays, minDays, maxDays, medianDays }`
   - `durationBySize: Record<TicketSize, DurationStats>` (declarado mas nao testado em W0 - W1 implementa)
   - `topAgents: ReadonlyArray<{ agent, count }>` ordenado DESC
   - `rejectionRate: number` (0..1, sem percentual)

3. **Duration medida em dias floor** (consistente com `daysOpen` do dashboard):
   - `floor((closedAt - createdAt) / 86_400_000)`.
   - Test usa diffs exatos (3 e 7 dias com tempos `00:00:00`) para evitar arredondamento.

4. **Tickets in-progress nao entram em `totalDuration`** (so closed-green).

5. **Ordenacao de `topAgents`:** count DESC, depois alfabetico em empate (sugestao do request).

6. **`metrics-cli.ts` em `cwd/.claude/.pipeline/`** - mesma estrutura que `dashboard-cli.ts`.

7. **`--json` flag** - output JSON parseable; CLI exit 0 em diretorio vazio (sem tickets) - assumido por consistencia com dashboard.

8. **`--write` flag** - NAO testada em W0 (out-of-scope para minimo viavel; W1 implementa se time permitir, mas pode entrar em ticket follow-up `CTR-PIPELINE-HARDENING`).

9. **ASCII puro** - mesmo workaround do ticket #2 para o bug do Node 24 strip-types. Aplicar em `scripts/pipeline/metrics.ts` E `metrics-cli.ts` desde o inicio (lecao aprendida).

10. **Reuso de `loadAllStates`** do `dashboard.ts` no `metrics-cli.ts` - sem duplicar leitura de FS.

---

## Notas para W1

- `scripts/pipeline/metrics.ts` - tipos + 3 funcoes (`computeMetrics`, `renderMetricsMd`, `renderMetricsJson`).
- `scripts/pipeline/metrics-cli.ts` - entrypoint; consome `loadAllStates` do dashboard.
- `package.json` ganha `"pipeline:metrics": "node --experimental-strip-types --no-warnings scripts/pipeline/metrics-cli.ts"`.
- `CLAUDE.md` atualizado no W1.
- Dogfood final: rodar `pnpm run pipeline:metrics` capturando output (deve mostrar `total=3`, com este ticket open + os 2 fechados).

---

## Veredito W0

RED confirmado. 8 cenarios descritos em 1 arquivo de teste. ASCII puro aplicado preventivamente. W1 pode comecar.

Proxima wave: **W1 - GREEN** com `scripts/pipeline/metrics.ts` + `metrics-cli.ts`.
