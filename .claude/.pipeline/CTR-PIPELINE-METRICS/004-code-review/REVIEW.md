# Code Review — CTR-PIPELINE-METRICS — Round 1

**Veredito:** ✅ **APPROVED**

**Reviewer:** code-reviewer (W2, read-only)
**Data:** 2026-05-21
**Escopo revisado:** 3 arquivos (~285 + ~80 + ~360 linhas).

---

## Nota de escopo

Tooling de pipeline em `scripts/pipeline/`. Igual aos tickets #1 e #2, categorias A/B/D/E (domínio, smart constructors, ports/adapters, modular monolith) **não aplicam**. Foco:

- **C** — discriminated unions / exhaustiveness ✅
- **F** — ESM / NodeNext / TS moderno ✅
- **G** — naming, clareza ✅
- **H** — tests ✅
- Robustez — div by zero, edge cases (n=0/1/2), ordenação determinística ✅

Nenhuma regra invariante do CLAUDE.md violada. Nenhum ADR contradito.

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não bloqueia, mas registrar)

#### Issue I1 — `scripts/pipeline/metrics.ts:92-110` — `byStatusOf` switch sem `default: never`

**Categoria:** C (discriminated unions / exhaustiveness)
**Problema:** O switch sobre `state.status` cobre os 5 valores de `TicketStatus`, mas não tem `default: { const _: never = s.state.status; }`. Hoje TS aceita via `noFallthroughCasesInSwitch`; se um novo status for adicionado ao schema (`'pending-review'`, etc.), counters silenciosamente perdem o ticket.

**4ª recorrência:**
- Ticket #1: `statusLabel` em `render-state-md.ts`.
- Ticket #2: `filterMatches` em `dashboard.ts`.
- Ticket #3 (este): `byStatusOf` em `metrics.ts`.

Padrão repetido — `CTR-PIPELINE-HARDENING` agora aglomera 4 instâncias do mesmo problema; vale fazer uma varredura completa quando o ticket de hardening rodar.

**Fix sugerido:**

```diff
   for (const s of snapshots) {
     switch (s.state.status) {
       case 'open': open++; break;
       case 'in-progress': inProgress++; break;
       case 'closed-green': closedGreen++; break;
       case 'closed-rejected': closedRejected++; break;
       case 'blocked': blocked++; break;
+      default: { const _: never = s.state.status; _; }
     }
   }
```

#### Issue I2 — `scripts/pipeline/{state-cli,dashboard-cli,metrics-cli}.ts` — `parseFlags` agora triplicado

**Categoria:** G (manutenção / DRY)
**Problema:** A 3ª cópia confirma definitivamente. `state-cli.ts:53` (versão `string only`), `dashboard-cli.ts:29` (versão `string | true`), `metrics-cli.ts:23` (versão `string | true`). As duas últimas são byte-idênticas — pura cópia-cola.

**Fix sugerido (no `CTR-PIPELINE-HARDENING`):** extrair para `scripts/pipeline/flags.ts`:

```ts
export type Flags = ReadonlyMap<string, string | true>;

export const parseFlags = (args: readonly string[]): Flags => { /* ... */ };

export const requireString = (flags: Flags, name: string): string | undefined => {
  const v = flags.get(name);
  return typeof v === 'string' ? v : undefined;
};
```

Os 3 CLIs consomem.

#### Issue I3 — `tests/pipeline/metrics.test.ts:6-21` — docblock obsoleto

**Categoria:** G (clareza / freshness)
**Problema:** Header reproduz o "Estes tests DEVEM FALHAR em W0..." que é folclore RED, agora factualmente falso (W1 fechou GREEN). 4ª recorrência (tickets #1, #2, e agora #3) confirma que o template do `tdd-strategist` produz docblock assim. Vale considerar fix no próprio template.

**Fix sugerido:**

```diff
- * Estes tests DEVEM FALHAR em W0 - `scripts/pipeline/metrics.ts` e
- * `scripts/pipeline/metrics-cli.ts` ainda nao existem.
+ * Historico: W0 (RED) falhou no import (script ainda inexistente). W1 (GREEN)
+ * implementou os 8 cenarios; agora TODOS passam. Ver `003-impl/REPORT.md`.
```

### 🔵 Sugestão (estilo / clareza)

#### Sugestão S1 — `scripts/pipeline/metrics.ts:76-77` — `?? 0` em `statsOf` é defensive coding morto

```ts
if (values.length === 0) return EMPTY_DURATION;       // guard
const sorted = [...values].sort((a, b) => a - b);
// ...
const min = sorted[0] ?? 0;                            // sorted.length > 0 garantido
const max = sorted[sorted.length - 1] ?? 0;            // idem
```

Os `?? 0` nunca disparam — a guard de length na linha 72 garante `sorted.length > 0`. Mas TS com `noUncheckedIndexedAccess` exige tratar como `T | undefined`. Aceitar como ruído visual do TS strict; **não bloqueia**. Alternativa: `sorted[0]!` (não-null assertion) — pior, viola outra regra. Manter `?? 0` é mais defensivo.

#### Sugestão S2 — `scripts/pipeline/metrics.ts:134` — `rounds >= 3` aceita rounds > 3 implicitamente

```ts
else if (w2.rounds >= 3) round3++;
```

Em condições normais, `state-cli.ts` bloqueia rounds > 3 com exit 2. Mas se um STATE.json corrompido ou editado à mão tiver `rounds=4`, ele cai no bucket `round3`. Defensivo correto (não perde o ticket). Documentar comment seria útil.

#### Sugestão S3 — `scripts/pipeline/metrics.ts:228-281` — `renderMetricsMd` poderia ser data-driven

Múltiplos `lines.push(...)` espalhados. Refactor possível com array literal único, mas tabela de "Duracao total" tem lógica condicional (count vs days). Aceitar como está; legível e fácil de modificar.

#### Sugestão S4 — `tests/pipeline/metrics.test.ts:91-99` — `makeSnapshot` poderia ser exportado de uma helper

A 3ª recorrência do `makeSnapshot` (com leve variação) entre `dashboard.test.ts` e `metrics.test.ts`. Test fixtures duplicação. Vale extrair `tests/pipeline/fixtures.ts` se a suite crescer; YAGNI agora.

---

## Validação do W1

### Dogfood end-to-end ✅

O W1 capturou o output de `pnpm run pipeline:metrics` no próprio repo:

```
Total: 3 tickets
- 1 in-progress (este ticket, agora em W2)
- 2 closed-green (#1 + #2)
- W2 rounds: avg=1.0, rejection rate 0% (perfeição até agora)
- Top agents corretamente agregados com tiebreak alfabético
```

Validações:
- ✅ `loadAllStates` reusado do dashboard — sem duplicação FS.
- ✅ Tickets in-progress NÃO entram em `totalDuration` (provado: count=2, não 3).
- ✅ Buckets `'main-session'` vs `'main-session (nodejs-fs-scripter ...)'` ficam separados (esperado por design).
- ✅ Median funciona para n=2 (avg = median quando 2 valores).

### ASCII puro aplicado preventivamente ✅

Sem disparos de `TS1127 Invalid character` durante typecheck. Lição do ticket #2 propagada com sucesso.

### Reuso de tipos ✅

`metrics.ts` importa `PipelineState`, `TicketSize`, `WaveEntry` de `state-schema.ts` e `TicketSnapshot` de `dashboard.ts`. Zero redefinição. Arquitetura coesa.

---

## O que está bom

- ✅ **`computeMetrics` é 100% puro** — recebe `ReadonlyArray<TicketSnapshot>`, retorna `PipelineMetrics`. Nenhum acesso a FS, nenhum `new Date()` runtime (só dentro de `computeDuration` parseando strings do schema). Testes determinísticos sem mocks.
- ✅ **Tratamento de division-by-zero** explícito em `rejectionRate`, `w2RoundsOf.avg`, e implícito em `statsOf([])` via early return.
- ✅ **`statsOf` com median para n=1, n=2, n par, n ímpar** — todos os casos cobertos. Test CA-T5 valida n=2 (median=avg=5).
- ✅ **`topAgentsOf` com tiebreak alfabético determinístico** — `localeCompare(b.agent)` em empate. Output reproducible em runs sucessivos.
- ✅ **`SizeBreakdown = Record<TicketSize, number>`** — mapped type aproveita o union. Tipo explícito e exaustivo via construção.
- ✅ **Função `formatNum(n)`** com early-return para int (`if (n === Math.floor(n))`) — output `1` em vez de `1.0` quando exato, sem perder precisão.
- ✅ **`durationBySize`** completo por `Record<TicketSize, DurationStats>` — todos os 5 sizes presentes mesmo quando vazios. Não há surpresa de "key missing".
- ✅ **`metrics-cli.ts` com `--write` salva no `pipelineRoot`** — convenção clara: `_METRICS.md` ou `_METRICS.json` ao lado dos tickets. Underscore prefix indica artefato gerado.
- ✅ **CA-T8 testa CLI + API direta** — `runCli(--json)` E `renderMetricsJson(computeMetrics([state]))`. Dois caminhos validados.
- ✅ **CA-T7 testa rejection com dados E vazio** — `assert.equal(empty.rejectionRate, 0)` linha 273 prova div-by-zero protegida.
- ✅ **CLAUDE.md atualizado** com 3 comandos.

---

## Métricas do round 1

| Item | Valor |
| :--- | ---: |
| Arquivos revisados | 3 |
| Linhas auditadas | ~725 |
| Issues 🔴 críticas | 0 |
| Issues 🟡 importantes | 3 |
| Sugestões 🔵 estilo | 4 |
| Veredito | APPROVED |
| Round | 1 / 3 |

---

## Próximo passo

✅ **APPROVED.** Pipeline-maestro avança para **W3 — QUALITY** com `ts-quality-checker`.

**`CTR-PIPELINE-HARDENING` cresceu para 10 itens:**
- Do ticket #1 (3): path traversal em init, docblock state-io.test, statusLabel sem default never.
- Do ticket #2 (4): filterMatches sem default never, outcomeOf sentinel `-` vs null, parseFlags DRY (2 cópias), docblock dashboard.test.
- Deste ticket (3): byStatusOf sem default never, parseFlags 3ª cópia (extrair `flags.ts`), docblock metrics.test.

Padrões repetidos sugerem que o hardening pode virar size **S** (não mais XS) — investigar template do `tdd-strategist` (gera docblocks obsoletos consistentemente) + adicionar lint rule para detectar switch sem `default: never` em DUs.

**Pré-condição W3:** rodar `pnpm test --test-concurrency=1` para evitar flakiness pré-existente. Esperado: 714 → 722 tests (+8 do metrics.test).
