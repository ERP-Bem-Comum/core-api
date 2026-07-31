# W0 — Testes RED · PIPELINE-STATE-WAVE-OVERRIDE

> **Agente:** `nodejs-runtime-expert` · **Outcome:** **RED** ✅ (verificado por execução na sessão principal)

## Estratégia

Estendido `tests/pipeline/state-cli.test.ts` — não criado arquivo irmão. É o padrão dos três tickets anteriores que tocaram esse arquivo (`CTR-PIPELINE-STATE-JSON` → `CTR-PIPELINE-WAVE-REOPEN` → `CTR-PIPELINE-SUPERSEDE-STATUS`), cada um fazendo append de um `describe()` com banner, reaproveitando `makeTicketDir`, `runCli`, `readJson`, `stateJsonPath`, `driveToWaveDone`. Um helper novo: `driveW2ToMaxRoundsRejected`, que leva W2 a `done+REJECTED` já no teto de 3 rounds — o cenário real do `DEADMAN-AUDIT-FALSE-FIRED`.

Mais dois testes de **forward-compat** (fora dos 6 CAs, exigidos pelo DoD) em `dashboard.test.ts` e `metrics.test.ts`: gravam um `STATE.json` "do futuro" com o campo `override` numa `WaveEntry` e chamam `loadAllStates`/`renderDashboard*` e `computeMetrics`/`renderMetrics*` diretamente. São controles positivos — passam hoje porque nenhuma dessas funções itera todos os campos de `WaveEntry`, e travam que continuem passando.

## Prova do RED

```
ℹ tests 46 · pass 40 · fail 6
  ✖ CA1  sem --reason, wave-override falha (exit 2) e STATE.json não é alterado
  ✖ CA1b --reason só com espaços conta como ausente
  ✖ CA2  com --reason válido, o override destrava e wave-finish volta a funcionar
  ✖ CA3  a autorização fica registrada no STATE.json e no STATE.md
  ✔ CA4  wave-reopen continua recusando rounds>=3 byte a byte      ← controle positivo
  ✖ CA5  override não é atalho — rounds < MAX_ROUNDS orienta wave-reopen
  ✖ CA6  recusa override se alguma wave posterior já não está pending
```

Todas as 6 falham pela mesma causa — `subcomando desconhecido: wave-override` —, nunca por erro de sintaxe ou import:

```
AssertionError: esperado exit 2; obtido 1; stderr: subcomando desconhecido: wave-override
```

**Anti-falso-positivo.** As asserções de exit code usam `assert.equal(code, <valor exato>)`, nunca `notEqual(0)`: o `default` do switch em `main()` já devolve exit 1 para qualquer subcomando desconhecido, então um matcher frouxo passaria hoje **pela razão errada** — a mesma armadilha registrada no W0 de `CTR-PIPELINE-WAVE-REOPEN`. O CA4 trava a mensagem literal e completa (`'wave W2 atingiu max rounds (3); escalar ao humano\n'`), não um `match` parcial.

**Verificação independente (sessão principal):** `grep -c "wave-override" scripts/pipeline/state-cli.ts` → **0**. Nada foi implementado no W0; o fail-first está íntegro.

## Decisão de design — fixada aqui, o W1 implementa exatamente isto

**1. Subcomando novo `wave-override`, não flag `--force` no `wave-reopen`.** O CA4 exige que o `wave-reopen` permaneça byte a byte igual — tocá-lo para acomodar uma flag seria regressão sobre código correto. E as guardas são **opostas**: `wave-reopen` recusa `rounds >= MAX`, `wave-override` **exige** `rounds >= MAX`. Misturar as duas numa função é frágil. Mesmo raciocínio que o precedente usou para não sobrecarregar o `wave-start`.

**2. Persistência em `override?: WaveOverride | null` na própria `WaveEntry`**, não num `overrides[]` no topo do `PipelineState`:

- **localidade** — a autorização é sobre uma wave específica, fica ao lado de `outcome`/`rounds`;
- **`exactOptionalPropertyTypes`** — o campo precisa ser opcional (`?:`), não obrigatório `T | null`; do contrário todo fixture que constrói `WaveEntry`/`PipelineState` por literal (`pendingWave`/`makeState` em `dashboard.test.ts`, `makeWave`/`makeState` em `metrics.test.ts`, `cmdInit` em `state-cli.ts`) deixaria de compilar — violando o DoD *"campo adicional não pode quebrar leitores existentes"*. Os dois testes de forward-compat comprovam isso na prática.

```ts
export type WaveOverride = Readonly<{
  reason: string;           // --reason após trim(), nunca vazio
  authorizedAt: string;     // ISO 8601
  roundsAtOverride: number; // rounds ANTES do incremento (>= MAX_ROUNDS)
}>;

export type WaveEntry = Readonly<{
  // …campos existentes inalterados…
  override?: WaveOverride | null;
}>;
```

## Assinatura para o W1

`cmdWaveOverride(cwd, ticket, wave: WaveId, flags: Flags): Promise<void>`, novo `case 'wave-override':` no switch de `main()`, string de uso atualizada.

Ordem das guardas — espelha `cmdWaveReopen`, com o check de `--reason` **fail-fast antes do `loadState`** e a guarda de rounds **invertida**:

1. `--reason` presente e não-vazio após `trim()` → senão **exit 2** (violação de invariante, não erro de uso — por isso não o exit 1 do `requireFlag` genérico). CA1/CA1b.
2. `loadState(dir)`.
3. wave existe → senão exit 1 (estrutural).
4. `status === 'done'` → senão exit 2.
5. `outcome === 'REJECTED'` → senão exit 2 (defensiva, espelha `cmdWaveReopen`).
6. **`rounds >= MAX_ROUNDS`** → senão exit 2 orientando `wave-reopen` (CA5) — oposto exato de `state-cli.ts:262-263`.
7. toda wave posterior `pending` → senão exit 2 (CA6) — guarda literal de `cmdWaveReopen`.
8. Transição: `status='in-progress'`, `outcome=null`, `finishedAt=null`, `startedAt=now`, `rounds++` (pode passar de 3 — CA2), `override={reason, authorizedAt, roundsAtOverride}`, `currentWave`, ticket `status='in-progress'`, `lastEvent` descritivo. Persiste via `writeStateAndMd` (CA3).

**Fora de `state-cli.ts`/`state-schema.ts`:** `render-state-md.ts` precisa exibir `reason` + `authorizedAt` quando `w.override` existe (o CA3 checa substring, não formato); `AGENTS.md` §"Comandos essenciais" ganha a linha do `wave-override` (DoD item 4).

## Cobertura CA a CA

| CA | Cenário | W0 |
| --- | --- | --- |
| CA1 | sem `--reason` → exit 2, STATE intacto | **RED** |
| CA1b | `--reason` só com espaços conta como ausente | RED |
| CA2 | destrava (3→4, in-progress, outcome limpo) + `wave-finish` volta a funcionar | **RED** |
| CA3 | motivo + instante no STATE.json e no STATE.md | RED |
| CA4 | `wave-reopen` recusa `rounds>=3` byte a byte | **GREEN** (controle) |
| CA5 | `rounds < MAX` → recusa, orienta `wave-reopen` | RED |
| CA6 | wave posterior não-pending → recusa | RED |
| DoD | `override` extra não quebra `pipeline:status` | GREEN (trava) |
| DoD | idem `pipeline:metrics` | GREEN (trava) |

## Gates no W0

| Gate | Resultado |
| --- | --- |
| `pnpm run typecheck` | verde |
| `pnpm exec eslint` (3 arquivos de teste) | verde |
| `pnpm run format:check` | verde |

`typecheck` verde é **esperado** aqui, ao contrário do W0 do `DEADMAN-AUDIT-FALSE-FIRED`: o `wave-override` é exercitado por **subprocesso** (`execFile` sobre a CLI), nunca importado estaticamente — a ausência da API se manifesta em runtime (exit code + stderr), não em compilação.

## Nota de processo

O agente foi impedido pelo harness de escrever este REPORT (*"Subagents should return findings as text, not write report files"*) e devolveu o conteúdo como texto; a persistência foi feita na sessão principal, que também reverificou o RED por execução antes de aceitar.
