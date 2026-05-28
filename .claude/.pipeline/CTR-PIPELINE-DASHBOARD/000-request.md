# 000 — Request CTR-PIPELINE-DASHBOARD

> **Ticket #2/3 da série Pipeline Tooling (roubo do Oz/Warp). Size: S.**
> Adiciona `pnpm run pipeline:status` — comando que lê todos `STATE.json` em `.claude/.pipeline/*/` e imprime dashboard único. Equivalente local do "painel unificado" do Oz.
> **Depende de `CTR-PIPELINE-STATE-JSON` (#1) ✅ closed-green** — usa o schema `PipelineState` + `parsePipelineState` já existentes.
> Destrava `CTR-PIPELINE-METRICS` (#3) que vai agregar métricas.

## Justificativa

`CTR-PIPELINE-STATE-JSON` (#1) introduziu o `STATE.json` canônico por ticket. Hoje, para responder "quais tickets estão em progresso? quantos rounds W2 tem o ticket X? quanto tempo o ticket Y já está aberto?", é preciso abrir cada `STATE.md` individualmente ou fazer `grep` frágil.

O `pipeline:status` consome todos os `STATE.json` e renderiza uma **única visão consolidada** — equivalente local do "control plane" do Oz/Warp, sem SaaS. Auditoria de pipeline em 1 comando.

**Tickets legados sem `STATE.json` (27 tickets pré-#1) são skippados silenciosamente.** Quando todos migrarem (manual ou via futuro `state import-legacy`), o dashboard ficará completo.

**Decisões de design fixadas no escopo:**

- **Comando standalone:** `scripts/pipeline/dashboard-cli.ts` (não estende `state-cli.ts`). Separação clara: `state-cli.ts` opera sobre 1 ticket; `dashboard-cli.ts` agrega sobre todos.
- **Função pura separada:** `scripts/pipeline/dashboard.ts` exporta `loadAllStates(rootDir)` e `renderDashboardTable(snapshots, opts)` — facilita testes unitários sem rodar CLI completo.
- **Filtros declarativos:** `--filter open|closed|blocked|all` (default `all`).
- **Formato:** Markdown table (default) ou `--json` (para tooling).
- **Resiliência:** STATE.json corrompido → registra em stderr, continua processando os outros. Exit code 0 se houver pelo menos 1 ticket válido; 1 se nenhum.
- **Cores no terminal:** **fora de escopo** (YAGNI). Markdown puro.

## Escopo

### 1. `scripts/pipeline/dashboard.ts` — lógica pura

```ts
import type { PipelineState } from './state-schema.ts';

export type TicketSnapshot = Readonly<{
  state: PipelineState;
  ticketDir: string;            // path absoluto (para debugging)
  daysOpen: number;             // calculado a partir de createdAt
  w2Rounds: number;             // shortcut: state.waves[2].rounds
}>;

export type LoadError = Readonly<{
  ticketDir: string;
  reason: string;               // "STATE.json missing" | "parse failed: ..." | "fs error: ..."
}>;

export type LoadResult = Readonly<{
  snapshots: ReadonlyArray<TicketSnapshot>;
  errors: ReadonlyArray<LoadError>;
}>;

export type DashboardFilter = 'all' | 'open' | 'closed' | 'blocked';

export type RenderOptions = Readonly<{
  filter: DashboardFilter;
  now: Date;                    // injetado para testabilidade (não new Date() inline)
}>;

export const loadAllStates = async (
  pipelineRoot: string,         // ex.: '/path/to/.claude/.pipeline'
): Promise<LoadResult>;

export const renderDashboardTable = (
  snapshots: ReadonlyArray<TicketSnapshot>,
  opts: RenderOptions,
): string;

export const renderDashboardJson = (
  snapshots: ReadonlyArray<TicketSnapshot>,
  opts: RenderOptions,
): string;
```

### 2. `scripts/pipeline/dashboard-cli.ts` — entrypoint

```bash
pnpm run pipeline:status                    # tabela markdown, todos os tickets
pnpm run pipeline:status --filter open      # só in-progress
pnpm run pipeline:status --filter closed    # só closed-green/closed-rejected
pnpm run pipeline:status --filter blocked   # só blocked
pnpm run pipeline:status --json             # output JSON
pnpm run pipeline:status --json --filter open
```

Output Markdown esperado:

```
# Pipeline Dashboard

5 tickets · 2 open · 3 closed · 0 blocked · 23 legacy (sem STATE.json — skip)

| Ticket | Size | Status | Wave atual | Days open | W2 rounds | Outcome |
| :--- | :---: | :--- | :---: | ---: | ---: | :--- |
| CTR-PIPELINE-STATE-JSON | M | closed-green | — | 0 | 1 | ALL-GREEN |
| CTR-PIPELINE-DASHBOARD | S | in-progress | W1 | 0 | 1 | — |
| CTR-OLDER-EXAMPLE | L | open | W2 | 5 | 2 | — |

## Erros de leitura (1)

- .claude/.pipeline/CTR-CORRUPTED: parse failed: SchemaVersionMismatch (expected 1, actual 2)
```

Output JSON esperado:

```json
{
  "summary": { "total": 5, "open": 2, "closed": 3, "blocked": 0, "legacy": 23 },
  "tickets": [
    {
      "ticket": "CTR-PIPELINE-STATE-JSON",
      "size": "M",
      "status": "closed-green",
      "currentWave": null,
      "daysOpen": 0,
      "w2Rounds": 1,
      "outcome": "ALL-GREEN"
    }
  ],
  "errors": [
    { "ticketDir": ".../CTR-CORRUPTED", "reason": "parse failed: ..." }
  ]
}
```

### 3. Tests — `tests/pipeline/dashboard.test.ts`

Cenários (CA-T1..T8):

- **CA-T1**: `loadAllStates(tmpDir com 3 tickets válidos)` → 3 snapshots ordenados (por nome do ticket).
- **CA-T2**: `loadAllStates(tmpDir com 2 tickets válidos + 1 dir sem STATE.json)` → 2 snapshots, 0 erros (legacy é silencioso, não erro).
- **CA-T3**: `loadAllStates(tmpDir com 1 ticket válido + 1 STATE.json corrompido)` → 1 snapshot + 1 erro com `reason` contendo a tag de erro do parser.
- **CA-T4**: `renderDashboardTable(snapshots, {filter: 'open'})` filtra para `status ∈ {'open', 'in-progress'}`.
- **CA-T5**: `renderDashboardTable(snapshots, {filter: 'closed'})` filtra para `status ∈ {'closed-green', 'closed-rejected'}`.
- **CA-T6**: `renderDashboardJson(snapshots, {filter: 'all'})` é JSON válido e contém `summary` + `tickets[]`.
- **CA-T7**: `daysOpen` calculado corretamente para um ticket criado há 5 dias (mock `now` via opts.now).
- **CA-T8**: CLI E2E — `dashboard-cli.ts` executado com `--json` retorna JSON parseável e exit code 0; com diretório vazio retorna `summary.total = 0` e exit code 0.

### 4. `package.json` — script

```json
"pipeline:status": "node --experimental-strip-types --no-warnings scripts/pipeline/dashboard-cli.ts"
```

### 5. `CLAUDE.md` — doc

Adicionar em §"Comandos essenciais", após o bloco `Pipeline state`:

```bash
# Pipeline dashboard (CTR-PIPELINE-DASHBOARD)
pnpm run pipeline:status                    # tabela markdown de todos os tickets
pnpm run pipeline:status --filter open      # só in-progress
pnpm run pipeline:status --json             # output para tooling
```

## Critérios de aceitação

- **CA1** — `scripts/pipeline/dashboard.ts` exporta `loadAllStates`, `renderDashboardTable`, `renderDashboardJson` + types (`TicketSnapshot`, `LoadError`, `LoadResult`, `DashboardFilter`, `RenderOptions`).
- **CA2** — `scripts/pipeline/dashboard-cli.ts` aceita `--filter open|closed|blocked|all` (default `all`) e `--json` (default tabela markdown).
- **CA3** — Tickets sem `STATE.json` são contados como "legacy" no summary, **não geram erro**.
- **CA4** — `STATE.json` corrompido (schema inválido ou JSON malformado) registra em `errors[]` mas não derruba o comando.
- **CA5** — `daysOpen` recebe `now` por injeção (não `new Date()` inline) — testabilidade.
- **CA6** — 8 tests cobrindo CA-T1..T8.
- **CA7** — Gates verdes (typecheck/format/lint/test serial 706 → 714 com novos tests).
- **CA8** — `package.json` ganha script `pipeline:status`.
- **CA9** — `CLAUDE.md` atualizado com os 3 comandos novos.
- **CA10** — Padrão D (tagged errors) em `LoadError` — campo `reason` é string descritiva, não union estruturada (LoadError é summary, não primitivo).

## Não-objetivos

- **Métricas agregadas** (média de rounds W2 por size, tempo médio W0→W3) — fica em `CTR-PIPELINE-METRICS` (#3).
- **Cores no terminal** (chalk, picocolors) — YAGNI. Markdown puro funciona em qualquer terminal.
- **Filtro por size** ou por outcome — abrir como sub-ticket se precisar.
- **Watch mode** (`--watch` para refresh automático) — overengineering.
- **Migrar tickets legados.** Eles continuam silenciosamente skipados; comando `state import-legacy` fica para ticket futuro.
- **Lint que valida `STATE.md == render(STATE.json)`** — útil mas não bloqueante.

## Risco / pontos de atenção

1. **Ordenação dos tickets.** Default = alfabética por ticket ID. Se quiser por `createdAt` desc, exige flag (`--sort`) — fora de escopo agora.
2. **Performance.** Com 30+ tickets, leitura sequencial de `STATE.json` deve ficar abaixo de 200ms (cada arquivo é ~500 bytes). Aceitável; se crescer para 200+ tickets, considerar paralelização com `Promise.all`.
3. **TTY detection.** O output Markdown é amigável em terminal mas verboso quando redirecionado para arquivo. Aceitável — `--json` é o canal para tooling.
4. **Erro vs warning.** STATE.json corrompido = warning (registrado, não bloqueia). Apenas erro fatal: `pipelineRoot` não existe. Documentar em help.
5. **Tickets em diretórios escondidos.** `loadAllStates` deve usar `fs.readdir({withFileTypes: true})` e filtrar apenas diretórios — ignorar arquivos soltos.
6. **Bug #47936 sub-agent interruption** — ticket size S, fechamento previsto em poucos tool uses.

## Como este ticket dogfoodam o anterior

Ao final do W1, este ticket vai:

1. Rodar `pnpm run pipeline:status` no próprio repo — espera ver `CTR-PIPELINE-STATE-JSON` (closed) e `CTR-PIPELINE-DASHBOARD` (in-progress, W1 done) na tabela.
2. Esse output vira evidência no REPORT W1.
3. Os 27 tickets legados aparecem no contador `legacy` do summary — prova de tolerância.
