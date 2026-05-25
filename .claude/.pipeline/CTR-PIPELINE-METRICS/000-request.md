# 000 — Request CTR-PIPELINE-METRICS

> **Ticket #3/3 da série Pipeline Tooling (ÚLTIMO). Size: M.**
> Adiciona `pnpm run pipeline:metrics` — agregador estatístico que lê todos `STATE.json` e produz métricas (rounds W2, duração total, distribuição por size/status, taxa de rejection, top agents).
> **Depende de:** `CTR-PIPELINE-STATE-JSON` (#1) ✅ + `CTR-PIPELINE-DASHBOARD` (#2) ✅ — reusa `loadAllStates` + `LoadResult`.
> Fecha a série Pipeline Tooling.

## Justificativa

O ticket #1 estabeleceu `STATE.json` canônico; o #2 entregou listagem agregada (`pnpm run pipeline:status`). Falta o terceiro pilar: **agregação estatística** que responde perguntas operacionais:

- Quantos tickets já fechei? Quantos por size?
- Qual a média de rounds W2? Tenho muito retrabalho de review?
- Quanto tempo um ticket size M demora em média do W0 ao close?
- Quais agentes/skills são mais acionados? Algum subutilizado?
- Qual a taxa de rejection no W2 (rounds > 1)?

Sem `pipeline:metrics`, essas perguntas exigem leitura manual de cada `STATE.json` e cálculo no caderno. Equivalente local do "Agent Memory analytics" do Oz/Warp — sem SaaS.

**Decisões de design fixadas no escopo:**

- **Reusa `loadAllStates(pipelineRoot)`** do `dashboard.ts` (não duplica leitura de FS).
- **Funções puras separadas em `scripts/pipeline/metrics.ts`** — `computeMetrics(snapshots)` + `renderMetricsMd(metrics)` + `renderMetricsJson(metrics)`.
- **Tempo medido em dias** (consistente com `daysOpen` do dashboard). Para sub-day, granularidade de horas via flag `--unit hours` fica como ticket futuro.
- **Estatísticas só consideram waves preenchidas** — tickets in-progress aparecem na contagem mas não nas médias de duração total.
- **`unknown` agent** vira bucket único — não tenta normalizar variantes (`main-session` vs `main-session (nodejs-fs-scripter)`).
- **Output default = stdout markdown.** Flag `--write` grava em `.claude/.pipeline/_METRICS.md`. Flag `--json` para tooling.
- **Sem filtros por size/agent ainda** — agrega tudo. Filtros viram ticket futuro se a tabela ficar grande.

## Escopo

### 1. `scripts/pipeline/metrics.ts` — lógica pura

```ts
import type { TicketSnapshot } from './dashboard.ts';

export type DurationStats = Readonly<{
  count: number;       // tickets que entraram na média (só closed-green)
  avgDays: number;     // média
  minDays: number;
  maxDays: number;
  medianDays: number;
}>;

export type StatusBreakdown = Readonly<{
  open: number;
  inProgress: number;
  closedGreen: number;
  closedRejected: number;
  blocked: number;
}>;

export type SizeBreakdown = Readonly<{
  XS: number;
  S: number;
  M: number;
  L: number;
  XL: number;
}>;

export type W2RoundsStats = Readonly<{
  count: number;       // tickets que rodaram W2 (status=done)
  avg: number;
  round1Only: number;  // closed em round 1
  round2: number;
  round3: number;
}>;

export type AgentCount = Readonly<{ agent: string; count: number }>;

export type PipelineMetrics = Readonly<{
  total: number;
  byStatus: StatusBreakdown;
  bySize: SizeBreakdown;
  w2Rounds: W2RoundsStats;
  totalDuration: DurationStats;       // só closed-green
  durationBySize: Readonly<Record<'XS' | 'S' | 'M' | 'L' | 'XL', DurationStats>>;
  topAgents: ReadonlyArray<AgentCount>; // por W{0,1,2,3}.agent, top 10
  rejectionRate: number;               // W2 rounds > 1 / total W2 done
}>;

export const computeMetrics = (
  snapshots: ReadonlyArray<TicketSnapshot>,
): PipelineMetrics;

export const renderMetricsMd = (metrics: PipelineMetrics): string;

export const renderMetricsJson = (metrics: PipelineMetrics): string;
```

### 2. `scripts/pipeline/metrics-cli.ts` — entrypoint

```bash
pnpm run pipeline:metrics               # markdown para stdout
pnpm run pipeline:metrics --json        # JSON para stdout
pnpm run pipeline:metrics --write       # grava em .claude/.pipeline/_METRICS.md
pnpm run pipeline:metrics --json --write # grava JSON em .claude/.pipeline/_METRICS.json
```

Output Markdown esperado (abreviado):

```
# Pipeline Metrics

Geração: 2026-05-21T14:30:00Z · 2 tickets · 0 legacy snapshots

## Status

| Status | Count |
| :--- | ---: |
| open | 0 |
| in-progress | 0 |
| closed-green | 2 |
| closed-rejected | 0 |
| blocked | 0 |

## Size

| XS | S | M | L | XL |
| ---: | ---: | ---: | ---: | ---: |
| 0 | 1 | 1 | 0 | 0 |

## W2 — rounds

- Tickets com W2 done: 2
- Round médio: 1.0
- Round 1 only: 2 · Round 2: 0 · Round 3: 0
- Taxa de rejection (rounds > 1): 0.0%

## Duração total (W0 → close, em dias) — só closed-green

| Métrica | Todos | XS | S | M | L | XL |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: |
| count | 2 | 0 | 1 | 1 | 0 | 0 |
| avg | 0 | - | 0 | 0 | - | - |
| min | 0 | - | 0 | 0 | - | - |
| max | 0 | - | 0 | 0 | - | - |
| median | 0 | - | 0 | 0 | - | - |

## Top agents (por contagem de waves executadas)

| Agent | Count |
| :--- | ---: |
| tdd-strategist | 2 |
| main-session | 2 |
| code-reviewer | 2 |
| ts-quality-checker | 2 |
```

Output JSON: equivalente estruturado.

### 3. Tests — `tests/pipeline/metrics.test.ts`

Cenários (CA-T1..T8):

- **CA-T1**: `computeMetrics([])` retorna `total=0`, `byStatus` zerado, `bySize` zerado, `w2Rounds.count=0`, `totalDuration.count=0`, `topAgents=[]`, `rejectionRate=0`.
- **CA-T2**: 3 snapshots (1 open, 1 closed-green, 1 closed-rejected) → `byStatus` correto: `{open: 1, inProgress: 0, closedGreen: 1, closedRejected: 1, blocked: 0}`.
- **CA-T3**: 4 snapshots (1 XS, 2 S, 1 M) → `bySize.XS=1, S=2, M=1`.
- **CA-T4**: 3 snapshots com W2 done (rounds 1, 2, 3) → `w2Rounds.avg = 2.0`, `round1Only=1, round2=1, round3=1`.
- **CA-T5**: 2 snapshots closed-green (durations 3 e 7 dias) → `totalDuration.avgDays=5, min=3, max=7, median=5`.
- **CA-T6**: 3 snapshots com agentes mistos (`tdd-strategist` em 2 waves, `code-reviewer` em 1) → `topAgents` contém `{agent: 'tdd-strategist', count: 2}` antes de `{agent: 'code-reviewer', count: 1}`.
- **CA-T7**: 4 W2 done (2 com rounds=1, 2 com rounds>1) → `rejectionRate = 0.5` (50%).
- **CA-T8**: CLI E2E — `metrics-cli.ts` com `--json` em diretório com 1 ticket valid → exit 0, JSON parseável com `total=1`.

### 4. `package.json` — script

```json
"pipeline:metrics": "node --experimental-strip-types --no-warnings scripts/pipeline/metrics-cli.ts"
```

### 5. `CLAUDE.md` — doc

Adicionar em §"Comandos essenciais", após bloco `Pipeline dashboard`:

```bash
# Pipeline metrics (CTR-PIPELINE-METRICS)
pnpm run pipeline:metrics                # markdown para stdout
pnpm run pipeline:metrics --json         # JSON
pnpm run pipeline:metrics --write        # grava em .claude/.pipeline/_METRICS.md
```

## Critérios de aceitação

- **CA1** — `scripts/pipeline/metrics.ts` exporta `computeMetrics`, `renderMetricsMd`, `renderMetricsJson` + types (`PipelineMetrics`, `StatusBreakdown`, `SizeBreakdown`, `W2RoundsStats`, `DurationStats`, `AgentCount`).
- **CA2** — `metrics-cli.ts` aceita `--json` e `--write` (mutualmente compatíveis: `--write` grava em `.claude/.pipeline/_METRICS.md` ou `_METRICS.json`).
- **CA3** — `computeMetrics([])` retorna shape válido com tudo zerado (não lança).
- **CA4** — `rejectionRate` é `0` se `w2Rounds.count === 0` (não divide por zero).
- **CA5** — `topAgents` ordenado por count DESC, max 10 entries.
- **CA6** — `totalDuration` ignora tickets sem `closedAt` (in-progress).
- **CA7** — 8 tests cobrindo CA-T1..T8.
- **CA8** — Gates verdes (typecheck/format/lint/test serial ≥ 722).
- **CA9** — `package.json` ganha script `pipeline:metrics`.
- **CA10** — `CLAUDE.md` atualizado com 3 comandos de metrics.
- **CA11** — ASCII puro em `scripts/pipeline/metrics.ts` (mesma lição do ticket #2 sobre Node 24 strip-types).

## Não-objetivos

- **Filtros por size/agent na CLI** (`--size M`, `--agent code-reviewer`) — abrir como sub-ticket se precisar.
- **Time-series** ("tickets fechados por semana") — exige separar por timestamp.
- **Métricas por wave individual** (média de duração W0, W1...) — só duração total (W0 → close).
- **Output HTML/CSV** — só Markdown + JSON.
- **Migrar tickets legados.** Continuam silenciosos (contados em `legacyCount` do `LoadResult`, mas não entram nas estatísticas).
- **Cores no terminal.** YAGNI, mesma escolha do ticket #2.

## Risco / pontos de atenção

1. **Divisão por zero.** Cuidado com `w2Rounds.count === 0` ao calcular `rejectionRate` e `avg`. Retornar `0` por convenção.
2. **Granularidade temporal.** `daysOpen` arredonda para baixo (floor). Tickets fechados em < 24h aparecem como `0` dias. Documentar no Markdown output. Granularidade horária fica para ticket futuro.
3. **Ordenação dos agentes.** Default: count DESC, depois alfabético em empate. Documentar no help.
4. **`'main-session'` vs `'main-session (nodejs-fs-scripter)'`** vão ser buckets diferentes. Aceitável — normalização posterior se virar problema.
5. **Performance.** Com 30+ tickets, agregação em memória deve ficar < 50ms. Aceitável; se crescer para 200+, considerar streaming.
6. **Median de `n=1` ou `n=2`.** Definir: median de [x] = x; median de [a,b] = (a+b)/2. Test cobre.

## Como este ticket fecha a série

Ao final do W1, este ticket vai:

1. Rodar `pnpm run pipeline:metrics` no próprio repo — espera ver `total=3` (CTR-PIPELINE-STATE-JSON, CTR-PIPELINE-DASHBOARD, CTR-PIPELINE-METRICS), W2 round médio 1.0 (todos aprovados no primeiro round), `topAgents` com `tdd-strategist`, `code-reviewer`, `ts-quality-checker` (3 cada).
2. Esse output vai capturado no REPORT W1 como evidência.
3. `--write` grava em `.claude/.pipeline/_METRICS.md` — primeiro snapshot histórico das métricas.
4. Encerra a série Pipeline Tooling — equivalente local do "Oz analytics dashboard" sem SaaS.
