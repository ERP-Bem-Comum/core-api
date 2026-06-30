# Code Review — CTR-PIPELINE-DASHBOARD — Round 1

**Veredito:** ✅ **APPROVED**

**Reviewer:** code-reviewer (W2, read-only)
**Data:** 2026-05-21
**Escopo revisado:** 3 arquivos (272 + 105 + 342 linhas).

---

## Nota de escopo

Tooling de pipeline em `scripts/pipeline/`. Igual ao ticket #1, categorias A/B/D/E (domínio, smart constructors, ports/adapters, modular monolith) **não aplicam**. Foco:

- **C** — discriminated unions / exhaustiveness ✅
- **F** — ESM / NodeNext / TS moderno ✅
- **G** — naming, clareza ✅
- **H** — tests ✅
- Estilo do projeto — `Result<T, E>` (consumido de `state-io.ts`), `readonly T[]`, `import type`, extensão `.ts` ✅

Nenhuma regra invariante do CLAUDE.md violada. Nenhum ADR contradito.

---

## Validação das decisões W1

### Decisão 1 — Render sempre recompute `daysOpen` + fixture do CA-T6 ajustado

**Contexto:** o W0 deixou inconsistência entre CA-T6 (espera `daysOpen=2` do cache do snapshot) e CA-T7 (espera recompute via `now + createdAt`). W1 escolheu render-source-of-truth e ajustou o fixture do CA-T6 para forçar `createdAt = '2026-05-19T00:00:00Z'` → recompute com `baseNow = '2026-05-21T12:00Z'` resulta em `floor(2.5) = 2`.

**Veredito:** ✅ **Justo.** Era impossível satisfazer ambos os tests com um único impl determinístico. A solução escolhida (render = source-of-truth para `daysOpen`) é a única coerente. O REPORT W1 documentou a mudança com clareza.

**Mitigação adicional sugerida (não bloqueia):** remover o field `daysOpen` do `TicketSnapshot` exportado por `loadAllStates` — virou ruído, já que render ignora o cache. Mas como o test CA-T6 ainda coloca `daysOpen: 0` no fixture (compulsório do tipo), manter o field economiza mais 1 round de quebra. **Manter como está.**

### Decisão 2 — ASCII puro em `dashboard.ts` (workaround Node 24)

W1 removeu Unicode dos comentários/strings de `dashboard.ts` porque `tsc --noEmit` e `--experimental-strip-types` quebraram com `TS1127 Invalid character`. Output do dashboard usa `|` em vez de `·` e `-` em vez de `—`.

**Veredito:** ✅ **Pragmático.** Estética perdida, funcionalidade ganha. Documentado no REPORT W1.

**Observação 🟡:** `dashboard-cli.ts` **manteve** Unicode em comentários (`—`) e strings (`inválido`, `não existe`, `silencioso`). Funciona — testes passam. Pode ser que o bug do strip-types do Node 24 só dispare em certas posições (Issue 4 abaixo). **Não bloqueia, mas vale registrar.**

---

## Issues encontradas

### 🔴 Crítica (bloqueia approval)

Nenhuma.

### 🟡 Importante (não bloqueia, mas registrar)

#### Issue I1 — `scripts/pipeline/dashboard.ts:55-66` — `filterMatches` sem exhaustiveness `default: never`

**Categoria:** C (discriminated unions / exhaustiveness)
**Problema:** O switch sobre `DashboardFilter` cobre os 4 valores, mas não tem `default: { const _: never = filter; return _; }`. Hoje TS aceita via `noFallthroughCasesInSwitch` + `noImplicitReturns`, mas se um filtro novo for adicionado (`'archived'`, etc.), o erro aparece longe (em runtime, falhando silenciosamente como `return undefined`).

**É a mesma issue I3 do W2 do ticket #1** (`statusLabel` em `render-state-md.ts`). Agrega no `CTR-PIPELINE-HARDENING`.

**Fix sugerido:**

```diff
 const filterMatches = (state: PipelineState, filter: DashboardFilter): boolean => {
   switch (filter) {
     case 'all':
       return true;
     case 'open':
       return state.status === 'open' || state.status === 'in-progress';
     case 'closed':
       return state.status === 'closed-green' || state.status === 'closed-rejected';
     case 'blocked':
       return state.status === 'blocked';
+    default: {
+      const _: never = filter;
+      return _;
+    }
   }
 };
```

#### Issue I2 — `scripts/pipeline/dashboard.ts:132-135` + `:177` — `outcomeOf` mistura sentinel `'-'` com semantic null

**Categoria:** G (clareza)
**Problema:** `outcomeOf` retorna `'-'` quando `w3.outcome` é null/undefined. Mas no JSON render (linha 177), há um double-check `outcomeOf(s.state) === '-' ? null : outcomeOf(s.state)` para converter de volta para `null`. Dois ifs em cadeia para extrair a mesma info, e `outcomeOf` é chamado duas vezes.

**Fix sugerido:** trocar tipo de retorno para `string | null`, deixar `null` quando ausente, formatar `'-'` só no markdown:

```ts
const outcomeOf = (state: PipelineState): string | null => {
  const w3 = state.waves.find((w) => w.id === 'W3');
  return w3?.outcome ?? null;
};

// no markdown: ${outcomeOf(s.state) ?? '-'}
// no JSON:     outcome: outcomeOf(s.state)
```

Cleanup natural; não bloqueia.

#### Issue I3 — `scripts/pipeline/{state-cli,dashboard-cli}.ts` — `parseFlags` duplicado (DRY)

**Categoria:** G (clareza / manutenção)
**Problema:** `parseFlags` aparece em 2 arquivos (`state-cli.ts:53` e `dashboard-cli.ts:29`) com lógicas quase idênticas. A versão do `dashboard-cli.ts` aceita `string | true` (boolean flags); a do `state-cli.ts` aceita só `string`. Duas variantes de quase a mesma função.

**Fix sugerido (futuro):** extrair para `scripts/pipeline/flags.ts` com versão unificada `parseFlags(args): ReadonlyMap<string, string | true>`. Ambos os CLIs consomem; `state-cli.ts` checa `typeof v === 'string'` antes de usar.

Agrega no `CTR-PIPELINE-HARDENING`.

#### Issue I4 — `tests/pipeline/dashboard.test.ts:16-17` — docblock desatualizado

**Categoria:** G (clareza / freshness de doc)
**Problema:** O docblock no topo ainda diz "Estes tests DEVEM FALHAR em W0 — `scripts/pipeline/dashboard.ts` e `dashboard-cli.ts` ainda não existem." É folclore do RED; em W1+ o texto é factualmente falso.

**Mesma issue I2 do W2 do ticket #1** (`state-io.test.ts` tinha docblock obsoleto sobre namespace import). Agrega no `CTR-PIPELINE-HARDENING`.

**Fix sugerido:**

```diff
 * Cobre CA-T1..T8:
   ...
-* Estes tests DEVEM FALHAR em W0 — `scripts/pipeline/dashboard.ts` e
-* `scripts/pipeline/dashboard-cli.ts` ainda não existem.
+* Histórico: em W0 estes tests falharam (RED) pois `scripts/pipeline/dashboard.ts`
+* e `dashboard-cli.ts` ainda não existiam. W1 (GREEN) implementou ambos.
+* Ver `003-impl/REPORT.md` para decisões de design.
```

### 🔵 Sugestão (estilo / clareza)

#### Sugestão S1 — `tests/pipeline/dashboard.test.ts:41` — `WAVE_IDS` duplicado com `state-schema.ts`

`state-schema.ts:13` já exporta `WAVE_IDS = ['W0', 'W1', 'W2', 'W3'] as const`. O teste redefine localmente em :41. Poderia importar:

```ts
import { WAVE_IDS } from '../../scripts/pipeline/state-schema.ts';
```

YAGNI agora; vale fix oportunístico.

#### Sugestão S2 — `tests/pipeline/dashboard.test.ts` — sem cleanup de `mkdtemp`

Mesma observação S4 do W2 do ticket #1. macOS faz auto-cleanup; não crítico.

#### Sugestão S3 — Inconsistência ASCII vs Unicode entre `dashboard.ts` (ASCII) e `dashboard-cli.ts` (Unicode mantido)

Documentado no REPORT W1. Pode reproduzir Node 24 strip-types issue em condições específicas. Quando reproduzir, abrir issue upstream. Por enquanto, viver com a inconsistência cosmética.

#### Sugestão S4 — `scripts/pipeline/dashboard.ts:113-116` — `enrichSnapshot` é chamado duas vezes em ambos os renders

Cada render (`Table` e `Json`) chama `snapshots.map((s) => enrichSnapshot(s, opts.now))` no início. Em prática a CLI só usa 1 dos 2, então não há overhead. Mas se um cenário futuro precisar de ambos (ex.: dual output), seria redundante. Refactor opcional.

---

## O que está bom

- ✅ **Função pura `loadAllStates`** com clear separation: lê filesystem, separa snapshots/errors/legacyCount, **sem cálculo dependente de tempo**. Boundary correto.
- ✅ **`daysOpen` recomputado via `opts.now`** — testabilidade pura. CA-T7 prova determinismo.
- ✅ **`legacyCount` como contador silencioso** — design choice clara: dir sem STATE.json **não** vira erro (ticket legado é legítimo).
- ✅ **`renderDashboardJson` produz `daysOpen` numérico, não string** — facilita consumidores tooling.
- ✅ **`renderDashboardJson` mapeia `'-'` → `null`** no campo `outcome` — semântica correta para JSON, mesmo que o impl seja um pouco redundante (Issue I2).
- ✅ **Discriminated union `DashboardFilter`** com switch exhaustivo (modulo Issue I1).
- ✅ **DI explícita via `RenderOptions`** — pattern aprendido no ticket #1 (`WriteStateOptions`) aplicado consistentemente.
- ✅ **CLI exit codes documentados** em comment do arquivo.
- ✅ **CA-T6 fixture honestamente comentado:** o comment dentro do fixture explica por que `daysOpen: 0` no input + `daysOpen: 2` na assertion — sem comment isso seria armadilha.
- ✅ **Dogfood end-to-end** rodado no próprio repo — output do `pnpm run pipeline:status` capturado no REPORT W1 prova:
  - 2 tickets com STATE.json detectados.
  - 55 tickets legacy contados sem erro.
  - Ordenação alfabética funcionando.
- ✅ **`execFileAsync` pattern reusado** do `state-cli.test.ts` (sem `promisify` que lint rejeita).
- ✅ **CLAUDE.md atualizado** com 4 comandos de dashboard.

---

## Métricas do round 1

| Item | Valor |
| :--- | ---: |
| Arquivos revisados | 3 |
| Linhas auditadas | ~720 |
| Issues 🔴 críticas | 0 |
| Issues 🟡 importantes | 4 |
| Sugestões 🔵 estilo | 4 |
| Veredito | APPROVED |
| Round | 1 / 3 |

---

## Próximo passo

✅ **APPROVED.** Pipeline-maestro avança para **W3 — QUALITY** com `ts-quality-checker`.

**Notas para W3:**
- Gates a rodar: `pnpm run typecheck`, `pnpm run format:check`, `pnpm run lint`, `pnpm test --test-concurrency=1` (serial, para evitar flakiness pré-existente).
- Os 4 🟡 importantes **não bloqueiam** W3 — agregam ao ticket follow-up `CTR-PIPELINE-HARDENING` que agora cresceu de 3 → 7 itens:
  - Do ticket #1: I1 (path traversal), I2 (docblock state-io), I3 (statusLabel exhaustiveness).
  - Deste ticket: I1 (filterMatches exhaustiveness), I2 (outcomeOf sentinel), I3 (parseFlags DRY), I4 (docblock dashboard.test).

**Pré-condição para W3:** rodar serial. Flakiness pré-existente de `tests/cli/` + `tests/regression/` sob paralelismo já está caracterizada no W3 do ticket anterior.
