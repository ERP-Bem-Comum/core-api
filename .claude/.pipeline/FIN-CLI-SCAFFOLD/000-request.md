# FIN-CLI-SCAFFOLD — Scaffold da CLI do módulo Financial

> **Size:** M · **Tipo:** Infrastructure/CLI scaffold (sem comandos de negócio reais ainda)
> **Sucessor de:** [`FIN-USECASE-APPROVE-PAYABLE`](../FIN-USECASE-APPROVE-PAYABLE/) (use case `approvePayable` pronto para ser exposto via CLI)
> **Bloqueia:** [`FIN-CLI-APROVAR-TITULO`](#) (primeiro comando real consumindo este scaffold)
> **Referência canônica:** `src/modules/contracts/cli/` (scaffold completo: registry, context, drivers, parsers, state, formatters)

---

## 1. Motivação

A CLI do módulo Financial está embrionária — `src/modules/financial/cli/main.ts` é apenas um placeholder do `FIN-CLI-WIRE` (sem REGISTRY, sem context, sem drivers, sem state).

O `approvePayable` use case está pronto e precisa ser exposto via CLI para a P.O. validar regra de negócio antes de gastar tempo em adapters reais (princípio da skill `application-cli-builder`). Para isso precisamos do **ecossistema de scaffold** que o contracts já tem.

Este ticket entrega o scaffold **sem incluir comandos de negócio reais** — pattern split do projeto. O próximo ticket (`FIN-CLI-APROVAR-TITULO`, S) consome o scaffold e adiciona o primeiro comando.

---

## 2. Decisões arquiteturais

### 2.1. Versão enxuta do scaffold do contracts

O contracts tem ~993 linhas distribuídas em 8 arquivos. Para o financial vamos entregar uma versão **proporcional ao estado atual** do módulo (1 agregado Payable, 1 use case):

| Arquivo | Contracts | Financial (este ticket) |
| :--- | ---: | :--- |
| `registry.ts` | 30L | ~15L (REGISTRY vazio com tipo) |
| `context.ts` | 58L | ~40L (só `payableRepo` + `clock` + `outbox` + `persist`/`shutdown`) |
| `parse-driver-flags.ts` | 118L | ~80L (só `memory` driver — `mysql` rejeitado como `not-supported-yet`) |
| `parse-flags.ts` | 61L | ~60L (helpers idênticos) |
| `state.ts` | 428L | ~150L (só Payable; sem Amendment/Document) |
| `drivers/memory.ts` | 81L | ~50L (só payableRepo + outbox) |
| `drivers/mysql.ts` | 58L | **NÃO criado** (fora do escopo — adapter Drizzle do financial ainda não existe) |
| `formatters/error.ts` | 159L | ~60L (só erros do scaffold — `cli-flag-*`, `state-*`) |
| `formatters/index.ts` | — | ~10L (barrel) |

**Total estimado:** ~465L src + ~250L tests = ~715L. Envelope **M**.

### 2.2. Driver `mysql` fora do escopo

O adapter Drizzle do `PayableRepository` ainda não existe (`FIN-ADAPTER-DRIZZLE-PAYABLE` é ticket futuro). Sem ele, não há o que fazer no driver mysql do CLI. Decisão:

- `parse-driver-flags.ts` **aceita** `--driver memory` (ou default = memory).
- `--driver mysql` retorna erro `'cli-driver-not-supported-yet'` com mensagem PT-BR explicando "Driver `mysql` será adicionado quando o adapter Drizzle do PayableRepository existir (ver `FIN-ADAPTER-DRIZZLE-PAYABLE`)."
- Quando o adapter chegar, abre-se `FIN-CLI-DRIVER-MYSQL` para estender o parser e criar `drivers/mysql.ts`.

### 2.3. REGISTRY começa vazio (mas tipado)

REGISTRY exporta `Record<string, SubCommand>` vazio. `main.ts` é refatorado para usar REGISTRY, mas a lista de subcomandos no `--help` mostra "(nenhum ainda — virá com FIN-CLI-APROVAR-TITULO)".

Smoke test no W0: garantir que `main.ts --help` ainda funciona (exit 0, stdout) e que `main.ts subcomando-qualquer` retorna `EXIT_USAGE` (64).

### 2.4. State file persiste **só Payables**

Análogo ao contracts (que persiste contracts + amendments + documents). Financial só tem Payable agora; outros agregados (FiscalDocument futuro) entram quando existirem.

Outbox **NÃO** persiste no state file (mesma decisão do contracts — outbox efêmero no driver memory; quando precisar de persistência, usa-se driver mysql com tabela `fin_outbox`).

### 2.5. `formatters/` começa minimalista

- `formatters/error.ts` — só erros do scaffold (`cli-flag-position-invalid`, `cli-flag-unknown`, `state-file-not-readable`, etc.).
- Formatters específicos de Payable (`payable.ts`, `status.ts`, `money.ts`) **NÃO** entram aqui — virão com `FIN-CLI-APROVAR-TITULO` ou serão reusados do contracts/shared quando aplicável.

### 2.6. `main.ts` refatorado mantendo backwards-compat

A refatoração preserva o comportamento atual (`--help` → stdout exit 0; subcomando desconhecido → stderr exit 64) e adiciona o pipeline `parseDriverFlags → buildContext → cmd.run`.

Como REGISTRY está vazio, qualquer subcomando cai em "desconhecido". W0 RED valida: smoke test com `aprovar-titulo` → exit 64 (porque REGISTRY vazio); depois W1 adiciona REGISTRY mas mantém vazio; smoke continua passando.

---

## 3. Critérios de Aceitação (CAs)

### 3.1. `registry.ts` (NOVO)

- **CA-1:** Exporta `type SubCommand = Readonly<{ descricao: string; help: string; run: (ctx, argv) => Promise<number> }>`.
- **CA-2:** Exporta `REGISTRY: Readonly<Record<string, SubCommand>> = {}` (vazio).
- **CA-3:** JSDoc cita: "REGISTRY começa vazio; comandos reais entram via `FIN-CLI-APROVAR-TITULO` e sucessores."

### 3.2. `context.ts` (NOVO)

- **CA-4:** `type CliContext = Readonly<{ payableRepo: PayableRepository; clock: Clock; driver: DriverKind; outbox: OutboxPort; persist: () => Promise<Result<void, StateError>>; shutdown: () => Promise<void> }>`.
- **CA-5:** `type CliContextError = StateError | 'cli-driver-not-supported-yet'`.
- **CA-6:** `buildContext(driver: DriverFlags)` switch exaustivo: `case 'memory' → buildMemoryContext`; `case 'mysql' → return err('cli-driver-not-supported-yet')`.

### 3.3. `parse-driver-flags.ts` (NOVO)

- **CA-7:** Exporta `type DriverKind = 'memory' | 'mysql'`.
- **CA-8:** Exporta `type DriverFlags = { kind: 'memory'; statePath: string | null } | { kind: 'mysql' }`.
- **CA-9:** `parseDriverFlags(argv)` aceita `--driver memory` (default) e `--state <path>` / `--no-state`.
- **CA-10:** `parseDriverFlags(argv)` aceita `--driver mysql` retornando `DriverFlags { kind: 'mysql' }` (validação acontece em `buildContext`).
- **CA-11:** Retorna `Result<{ driver: DriverFlags; rest: readonly string[] }, CliFlagError>` onde `rest` são os flags restantes para o subcomando.

### 3.4. `parse-flags.ts` (NOVO)

- **CA-12:** Helpers genéricos copiados do contracts (`extractFlagValue`, `hasBooleanFlag`, etc.). Sem modificações.

### 3.5. `state.ts` (NOVO)

- **CA-13:** `loadState(path, payableHandle)` lê JSON, valida schema, rehydrata Payables e os reinjeta no handle via `handle.repo.save(payable, [])`.
- **CA-14:** `saveState(path, payableHandle)` serializa Payables via mappers (reusa mappers de `adapters/persistence/mappers/payable.mapper.ts` quando existirem; W1 decide reusar ou criar projeção CLI).
- **CA-15:** `acquireStateLock(path)` / `releaseStateLock(path)` — file lock por `${path}.lock` (pattern do contracts).
- **CA-16:** `StateError` union: `'state-file-not-readable' | 'state-file-corrupted' | 'state-schema-invalid' | 'state-entity-invalid' | 'state-concurrent-lock' | 'state-file-not-writable'`.

### 3.6. `drivers/memory.ts` (NOVO)

- **CA-17:** `buildMemoryContext(statePath: string | null)` cria `InMemoryOutbox` + `InMemoryPayableRepository(outbox.port)`.
- **CA-18:** Se `statePath !== null`, adquire lock + `loadState`; libera lock no `shutdown`.
- **CA-19:** `persist()` chama `saveState` quando `statePath !== null`; no-op caso contrário.

### 3.7. `formatters/error.ts` (NOVO) + `formatters/index.ts` (NOVO)

- **CA-20:** `formatErrorCode(code)` aceita `CliFlagError | StateError | 'cli-driver-not-supported-yet'` e retorna string PT-BR humana.
- **CA-21:** Mensagem de `'cli-driver-not-supported-yet'` cita ticket `FIN-ADAPTER-DRIZZLE-PAYABLE` como pré-requisito.
- **CA-22:** `index.ts` re-exporta `formatErrorCode`.

### 3.8. `main.ts` (MODIFICADO)

- **CA-23:** Refatorado para usar `parseDriverFlags → buildContext → cmd.run → ctx.shutdown` (pattern do `contracts/cli/main.ts`).
- **CA-24:** `--help` lista REGISTRY (mesmo que vazio) e flags globais (`--driver`, `--state`, `--no-state`, `--help`).
- **CA-25:** Subcomando desconhecido → `stderr` + `EXIT_USAGE (64)`.
- **CA-26:** Erro de context (driver-not-supported, state-*) → mapeado para exit code via `EXIT_CODE_BY_CONTEXT_ERROR`.

### 3.9. Testes (`tests/modules/financial/cli/`)

- **CA-27:** `tests/modules/financial/cli/main.test.ts` — smoke tests via `execFile('node', [..., 'src/modules/financial/cli/main.ts', '--help'])`. 3 cenários: `--help` (exit 0 stdout), sem args (exit 64 stderr), subcomando desconhecido (exit 64).
- **CA-28:** `tests/modules/financial/cli/parse-driver-flags.test.ts` — unit tests cobrindo `--driver memory`, `--driver mysql`, `--state`, `--no-state`, flag desconhecida.
- **CA-29:** `tests/modules/financial/cli/state.test.ts` — round-trip: salvar 1 Payable, ler, comparar (pattern de fixtures reusa Payable.open real).

### 3.10. Quality Gate (W3)

- **CA-30:** `pnpm run typecheck` exit 0.
- **CA-31:** `pnpm run format:check` exit 0.
- **CA-32:** `pnpm run lint` exit 0 (zero warnings).
- **CA-33:** `pnpm test` exit 0, baseline +N testes novos (esperado **+8 a +15**), zero regressão.

---

## 4. Estrutura de arquivos esperada

```
src/modules/financial/cli/
├── main.ts                        ← MODIFICADO (usa REGISTRY + context + drivers)
├── registry.ts                    ← NOVO (~15L, REGISTRY vazio)
├── context.ts                     ← NOVO (~40L)
├── parse-driver-flags.ts          ← NOVO (~80L)
├── parse-flags.ts                 ← NOVO (~60L)
├── state.ts                       ← NOVO (~150L)
├── drivers/
│   └── memory.ts                  ← NOVO (~50L)
└── formatters/
    ├── error.ts                   ← NOVO (~60L)
    └── index.ts                   ← NOVO (~10L)

tests/modules/financial/cli/
├── main.test.ts                   ← NOVO (~80L, 3 smoke tests)
├── parse-driver-flags.test.ts     ← NOVO (~80L)
└── state.test.ts                  ← NOVO (~90L)
```

**Total estimado:** ~465L src + ~250L tests = ~715L. Envelope **M**.

---

## 5. Fora do escopo (próximos tickets)

| Item | Ticket sugerido |
| :--- | :--- |
| Primeiro comando real `aprovar-titulo` | `FIN-CLI-APROVAR-TITULO` (S) |
| Comandos adicionais (`transmitir-titulo`, `processar-saida-bancaria`) | `FIN-CLI-TRANSMITIR-TITULO` (S) etc. |
| Driver `mysql` real | `FIN-CLI-DRIVER-MYSQL` (depois de `FIN-ADAPTER-DRIZZLE-PAYABLE`) |
| Formatters específicos de Payable | Junto com `FIN-CLI-APROVAR-TITULO` |
| Comando `run-outbox-worker` | `FIN-CLI-RUN-OUTBOX-WORKER` (junto de `FIN-WORKER-OUTBOX`) |

---

## 6. Regras invariantes aplicáveis

- `.claude/rules/adapters.md` — CLI é parte de adapters; converte Result na borda; sem throw vazado.
- `.claude/rules/testing.md` — smoke tests via `node:child_process.execFile`; mirror src/.
- ADR-0006 — kernel compartilhado (`src/shared/ports/clock.ts`) reusado.
- ADR-0020 — só MySQL (não SQLite); driver `mysql` vem depois.

---

## 7. Riscos / pontos de atenção (para W2)

1. **`state.ts` precisa de mappers para Payable.** Decidir em W1 se reusa `src/modules/financial/adapters/persistence/mappers/payable.mapper.ts` (Drizzle mapper que rehydrate via Money/Period/etc.) ou cria projeção CLI específica. **Preferência:** reusar — DRY arquitetural.
2. **`parseDriverFlags` aceita `--driver mysql` mas `buildContext` rejeita.** Decisão consciente para separar "parsing" de "validação de capacidade". Caller vê erro `cli-driver-not-supported-yet` com mensagem clara.
3. **`outbox` no CliContext** — incluir já o `OutboxPort` (sem `WorkerOutboxOps` por enquanto, porque não temos worker). Quando `FIN-WORKER-OUTBOX` chegar, expande para `OutboxPort & WorkerOutboxOps`.
4. **REGISTRY vazio** dispara "subcomando desconhecido" para QUALQUER coisa. W0 RED valida; W1 mantém vazio.
5. **`main.ts` refatorado** quebra os 4 testes existentes do `FIN-CLI-WIRE` (provavelmente em `tests/cli/financial.cli.test.ts`). Verificar antes do W1. Migrar testes para o novo formato (smoke via REGISTRY).
