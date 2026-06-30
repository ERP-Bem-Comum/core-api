# 000 — Request CTR-PIPELINE-STATE-JSON

> **Ticket #1/3 da série Pipeline Tooling (roubo do Oz/Warp). Size: M.**
> Introduz `STATE.json` como source-of-truth tipado do estado de cada ticket, mantendo `STATE.md` como visão humana **gerada** a partir do JSON. Destrava os próximos dois tickets da série (`CTR-PIPELINE-DASHBOARD`, `CTR-PIPELINE-METRICS`).
> Inspirado em "API e SDK de primeira classe com valores de retorno" do Oz (Warp).
> Sem dependências de tickets anteriores — primeiro ticket pós-Outbox.

## Justificativa

Hoje `STATE.md` de cada ticket é Markdown livre. Para responder perguntas triviais ("quantos tickets levaram >1 round em W2?", "qual a média de duração W0→W3 por size?", "que tickets estão bloqueados?") é necessário grep frágil + parsing humano. O Oz/Warp resolve isso com "control plane" centralizado; nós podemos replicar localmente sem SaaS: **adicionar um `STATE.json` canônico ao lado do `STATE.md`** e tornar o `.md` um artefato derivado, idempotente, gerado a partir do JSON.

Benefícios em cascata:

1. `CTR-PIPELINE-DASHBOARD` (ticket #2) lê todos `STATE.json` e renderiza tabela única (`pnpm run pipeline:status`).
2. `CTR-PIPELINE-METRICS` (ticket #3) agrega `STATE.json` em `_METRICS.md` global (média de rounds W2 por size, taxa de rejection, agentes mais usados).
3. Auditoria de drift: lint verifica que `STATE.md == render(STATE.json)` — impossível ter `.md` desatualizado.

**Decisões de design fixadas no escopo:**

- **`STATE.json` é canônico, `STATE.md` é gerado.** Single source of truth — elimina drift.
- **Não migrar tickets fechados à força.** Os 27 tickets em `.claude/.pipeline/` continuam válidos sem JSON; dashboards/métricas só consomem o que tem JSON. Migração opcional e oportunística.
- **Tooling fica em `scripts/pipeline/`** na raiz, não em `src/modules/` — é meta-processo, não código de produção. Mas obedece os mesmos gates (typecheck, lint, test).
- **Atomic write** (tmpfile + rename) — evitar corrupção de JSON se processo for interrompido.
- **Hook `inject-ticket-context.sh` não muda.** Continua lendo `STATE.md` (que agora é gerado). Compatibilidade backward total.

## Escopo

### 1. `scripts/pipeline/state-schema.ts` — schema tipado + parser

```ts
import { type Result, ok, err } from '#src/shared/result.ts';

export const PIPELINE_STATE_SCHEMA_VERSION = 1 as const;

export type WaveId = 'W0' | 'W1' | 'W2' | 'W3';

export type WaveOutcome =
  | 'RED'           // W0 entregue como RED
  | 'GREEN'         // W1 entregue como GREEN
  | 'APPROVED'      // W2 review aprovado
  | 'REJECTED'      // W2 review reprovado (algum round)
  | 'ALL-GREEN';    // W3 gates verdes

export type WaveStatus = 'pending' | 'in-progress' | 'done' | 'failed';

export type WaveEntry = Readonly<{
  id: WaveId;
  status: WaveStatus;
  agent: string | null;          // agente responsável (null antes de start)
  startedAt: string | null;       // ISO-8601
  finishedAt: string | null;      // ISO-8601
  rounds: number;                 // padrão 1; W2 pode chegar a 3
  reportPath: string | null;      // caminho relativo ao root do repo
  outcome: WaveOutcome | null;
}>;

export type TicketStatus =
  | 'open'
  | 'in-progress'
  | 'closed-green'
  | 'closed-rejected'
  | 'blocked';

export type TicketSize = 'XS' | 'S' | 'M' | 'L' | 'XL';

export type PipelineState = Readonly<{
  schemaVersion: typeof PIPELINE_STATE_SCHEMA_VERSION;
  ticket: string;                 // ex.: 'CTR-PIPELINE-STATE-JSON'
  size: TicketSize;
  createdAt: string;
  closedAt: string | null;
  currentWave: WaveId | null;     // null antes de W0 começar
  status: TicketStatus;
  waves: ReadonlyArray<WaveEntry>;
  blockers: ReadonlyArray<string>;
  lastEvent: string;              // texto curto para humano
}>;

export type ParseError =
  | { tag: 'InvalidJson'; reason: string }
  | { tag: 'SchemaVersionMismatch'; expected: number; actual: unknown }
  | { tag: 'MissingField'; field: string }
  | { tag: 'InvalidFieldType'; field: string; expected: string; actual: string };

export const parsePipelineState = (
  raw: string,
): Result<PipelineState, ParseError> => { /* ... */ };
```

### 2. `scripts/pipeline/state-io.ts` — leitura/escrita atômica

```ts
export const readState = (ticketDir: string): Promise<Result<PipelineState, ReadError>>;

export const writeState = (
  ticketDir: string,
  state: PipelineState,
): Promise<Result<void, WriteError>>;
// Implementação: writeFile em <ticketDir>/STATE.json.tmp, depois rename atômico.
```

### 3. `scripts/pipeline/render-state-md.ts` — gerador determinístico

```ts
export const renderStateMd = (state: PipelineState): string;
// Output formatado idêntico ao STATE.md atual (manter compat com inject-ticket-context.sh).
```

### 4. `scripts/pipeline/state-cli.ts` — comandos

```bash
pnpm run pipeline:state init <ticket> --size S
# Cria STATE.json em .claude/.pipeline/<ticket>/ com 4 waves em 'pending'

pnpm run pipeline:state wave-start <ticket> W0 --agent tdd-strategist
# Marca W0 status=in-progress, startedAt=now, agent

pnpm run pipeline:state wave-finish <ticket> W0 --outcome RED --report 002-tests/REPORT.md
# Marca W0 status=done, finishedAt=now, outcome, reportPath
# Avança currentWave para W1

pnpm run pipeline:state wave-round <ticket> W2
# Incrementa rounds[W2] em 1 (até max 3 — bloqueia além disso com exit code 2)

pnpm run pipeline:state close <ticket>
# Verifica todas as 4 waves done; marca status=closed-green, closedAt=now

pnpm run pipeline:state render <ticket>
# Regenera STATE.md a partir de STATE.json (idempotente)
```

Toda comando: se STATE.json é alterado, `render` roda automaticamente em sequência.

### 5. Tests — `tests/pipeline/`

```
tests/pipeline/state-schema.test.ts   # parser, version mismatch, missing fields
tests/pipeline/state-io.test.ts        # atomic write (simular crash), idempotência
tests/pipeline/render-state-md.test.ts # snapshot do output
tests/pipeline/state-cli.test.ts       # cada comando via execFile
```

Cenários cobertos (mínimo 12 tests):

- **CA-T1**: `parsePipelineState` aceita JSON válido v1.
- **CA-T2**: `parsePipelineState` rejeita JSON malformado → `InvalidJson`.
- **CA-T3**: `parsePipelineState` rejeita `schemaVersion: 2` → `SchemaVersionMismatch`.
- **CA-T4**: `parsePipelineState` rejeita JSON sem campo obrigatório (ex.: `ticket`) → `MissingField`.
- **CA-T5**: `writeState` é atômico — após "crash" (mock que aborta o rename), `STATE.json` original permanece intacto.
- **CA-T6**: `renderStateMd` é determinístico — chamar 2x com mesmo input produz string idêntica.
- **CA-T7**: `renderStateMd` produz output parseável pelo `inject-ticket-context.sh` (assert que regex existente do hook ainda casa).
- **CA-T8**: `state init` cria estrutura inicial correta com 4 waves pending.
- **CA-T9**: `state wave-start` rejeita se wave anterior não está `done` (exit code 2, mensagem clara).
- **CA-T10**: `state wave-finish` atualiza `currentWave` para próxima wave.
- **CA-T11**: `state wave-round` em W2 incrementa de 1 para 2; chamada 3x atinge 3; 4ª chamada falha com exit code 2.
- **CA-T12**: `state close` rejeita se alguma wave não está `done`.

### 6. Documentação operacional

Atualizar `CLAUDE.md` na seção **"Pipeline fail-first W0→W3"**:

```diff
 .claude/.pipeline/<TICKET-ID>/
 ├── 000-request.md           # escopo (humano escreve antes)
+├── STATE.json               # ← canônico (a partir do CTR-PIPELINE-STATE-JSON)
+├── STATE.md                 # ← gerado de STATE.json; não editar à mão
 ├── 002-tests/REPORT.md      # W0
 ├── 003-impl/REPORT.md       # W1
 ├── 004-code-review/REVIEW.md  # W2
 ├── 005-quality/REPORT.md    # W3
-└── STATE.md                 # status acumulado
+└── (waves continuam iguais)
```

E adicionar parágrafo curto explicando que tickets antigos sem `STATE.json` continuam válidos (legacy), mas todo ticket novo deve usar `pnpm run pipeline:state init` em vez de criar `STATE.md` manualmente.

Adicionar entrada em **"Comandos essenciais"**:

```bash
# Pipeline state (a partir do CTR-PIPELINE-STATE-JSON)
pnpm run pipeline:state init <ticket> --size S
pnpm run pipeline:state wave-start <ticket> W0 --agent tdd-strategist
pnpm run pipeline:state wave-finish <ticket> W0 --outcome RED --report 002-tests/REPORT.md
pnpm run pipeline:state close <ticket>
pnpm run pipeline:state render <ticket>   # regenera STATE.md
```

### 7. `package.json` — scripts npm

```json
"scripts": {
  "pipeline:state": "node --experimental-strip-types scripts/pipeline/state-cli.ts"
}
```

## Critérios de aceitação

- **CA1** — `scripts/pipeline/state-schema.ts` define `PipelineState`, `WaveEntry`, `parsePipelineState` retornando `Result<PipelineState, ParseError>` com 4 variantes de erro tipadas.
- **CA2** — `STATE.json` em `.claude/.pipeline/CTR-PIPELINE-STATE-JSON/` é o primeiro ticket a usar o novo formato; `STATE.md` deste ticket é gerado por `renderStateMd`.
- **CA3** — `writeState` é atômico (tmpfile + rename); teste simula falha no rename e verifica que arquivo original permanece intacto.
- **CA4** — `renderStateMd` é determinístico e produz output que o hook `inject-ticket-context.sh` consegue parsear sem modificação.
- **CA5** — CLI tem 6 comandos: `init`, `wave-start`, `wave-finish`, `wave-round`, `close`, `render`.
- **CA6** — Tickets legados (sem `STATE.json`) continuam funcionais; `state-cli.ts` rejeita comandos contra tickets sem STATE.json com mensagem clara.
- **CA7** — Mínimo 12 tests cobrindo CA-T1..T12 acima.
- **CA8** — Gates verdes (typecheck/format/lint/test).
- **CA9** — `CLAUDE.md` atualizado (seção Pipeline + Comandos essenciais).
- **CA10** — Padrão D mantido (tagged errors + case constructors em `state-schema.ts`).

## Não-objetivos

- **Dashboard** (`pnpm run pipeline:status`) — fica em `CTR-PIPELINE-DASHBOARD` (#2).
- **Métricas agregadas** (`_METRICS.md` global) — fica em `CTR-PIPELINE-METRICS` (#3).
- **Migração automática dos 27 tickets fechados.** Comando `state import-legacy` pode vir em ticket futuro; aqui, só legacy-tolerant read.
- **Lint que valida `STATE.md == render(STATE.json)`** — útil mas não bloqueante; opcional em ticket de polimento.
- **Integração com hooks `.claude/hooks/*.sh`** — eles continuam lendo `STATE.md`. Sem mudança neles.
- **Schema v2.** Só v1 — bump quando houver breaking change real.

## Risco / pontos de atenção

1. **Tooling em TS via `--experimental-strip-types`.** Confirmar que `scripts/pipeline/` pode rodar fora de `src/`. Ajustar `tsconfig.json` se necessário (pode exigir `include` extra).
2. **Atomic rename em macOS.** `fs.rename` em macOS é POSIX-atômico no mesmo filesystem; tmpfile deve ficar no mesmo diretório de destino. Documentar no código.
3. **Determinismo do render.** Ordem das chaves no `JSON.stringify`, formatação de datas (sempre ISO UTC), quebras de linha (`\n` em todos os SOs). Test fixa um snapshot.
4. **Bug #47936 sub-agent interruption.** Ticket size M — invocar `code-reviewer` em W2 com checklist embutido + verificar filesystem após cada `Agent(...)` (mitigation de [[project_subagent_47936_mitigation]]).
5. **Ordering das waves no JSON.** Garantir que `waves` sempre tem 4 entradas em ordem W0→W3 (mesmo as pendentes); simplifica o render.
6. **Erro de race no CLI.** Se dois comandos rodam simultâneos no mesmo ticket, último wins. Aceitável — pipeline humano é serial.

## Como este ticket usa o próprio sistema

Este é o **primeiro ticket a usar `STATE.json` desde o início**. W0 (RED) cria os tests sem o arquivo schema/io/render. W1 (GREEN) implementa schema/io/render/cli, e ao final emite o próprio `STATE.json` deste ticket via `pnpm run pipeline:state init CTR-PIPELINE-STATE-JSON --size M`. W2 review valida que o `STATE.md` gerado deste ticket bate com o conteúdo esperado. W3 fecha com `pnpm run pipeline:state close CTR-PIPELINE-STATE-JSON`.

Dogfood total.
