# Estado do Ticket CTR-CLI-DRIVER-FLAG

| Wave | Status |
| :--- | :--- |
| W0 — RED | ✅ done — 24 testes RED (17 parser + 7 E2E SQLite); total 310 (286 pass, 24 fail) |
| W1 — GREEN | ✅ done — 310/310 verdes; parser real + 3 drivers + 6 comandos refatorados |
| W2 — REVIEW | ✅ APPROVED_WITH_NOTES — 6 dimensões OK; 6 notes opcionais para W3 |
| W3 — QUALITY | ✅ done — NOTES 2/3/4 endereçadas, handbook §4.1 nova, smoke test green, 310/310 verdes |

## W0 entregue

### Arquivos criados

```
src/modules/contracts/cli/
└── parse-driver-flags.ts          # stub: sempre retorna err — define a forma final

tests/modules/contracts/cli/
└── parse-driver-flags.test.ts     # 17 unit tests do parser

tests/cli/
├── helpers/
│   └── temp-db.ts                 # newDbFile() + removeDbFile() (limpa WAL/SHM colaterais)
└── contracts.cli.sqlite.test.ts   # 7 E2E rodando os cenários BDD com --driver sqlite
```

### Forma final exposta no stub (assinatura validada pelo W0)

```ts
export type DriverFlags = Readonly<
  | { kind: 'memory'; statePath: string | null }
  | { kind: 'sqlite'; dbPath: string }      // ':memory:' ou caminho
  | { kind: 'mysql'; connectionString: string }
>;

export type DriverFlagsError =
  | 'cli-driver-unknown'
  | 'cli-driver-flag-conflict'
  | 'cli-driver-missing-value';

export const parseDriverFlags = (argv: readonly string[])
  => Result<{ driver: DriverFlags; rest: readonly string[] }, DriverFlagsError>;
```

## W1 entregue

### Arquivos novos

```
src/modules/contracts/cli/drivers/
├── memory.ts                       # InMemory + state file (preserva behavior atual)
├── sqlite.ts                       # Drizzle/SQLite via openSqlite() + shutdown fecha conexão
└── mysql.ts                        # stub — retorna err('cli-mysql-driver-not-wired')
```

### Arquivos refatorados

| Arquivo | Mudança |
| :--- | :--- |
| `parse-driver-flags.ts` | implementação real (stub W0 → parser completo, 17 cenários verdes) |
| `context.ts` | `CliContext` agora expõe **ports** (`contractRepo`, `amendmentRepo`, `eventBus`); `persist` virou `Promise<Result<>>`; novo `shutdown: () => Promise<void>` |
| `main.ts` | chama `parseDriverFlags` antes do `buildContext`; `try/finally` em volta de `cmd.run()` garante `ctx.shutdown()` (libera conexão SQLite) |
| `criar-contrato.ts`, `listar-contratos.ts`, `mostrar-contrato.ts`, `criar-aditivo.ts`, `anexar-documento.ts`, `homologar-aditivo.ts` | `ctx.contractRepoHandle.repo` → `ctx.contractRepo`; `ctx.eventBusHandle.bus` → `ctx.eventBus`; `ctx.persist()` agora aguarda Promise |
| `formatters/error.ts` | +7 entradas PT-BR: `cli-driver-*`, `cli-mysql-driver-not-wired`, `sqlite-driver-*` |

### Sintaxe alvo confirmada e funcionando

```bash
# Default (backward compat — InMemory + cli-state.json)
node main.ts criar-contrato --numero 001/2026 --titulo "..." ...

# Explícito
node main.ts criar-contrato --driver memory --state ./qa.json --numero ...

# SQLite com arquivo persistido
node main.ts criar-contrato --driver sqlite --db ./teste.db --numero ...

# SQLite efêmero (:memory:)
node main.ts listar-contratos --driver sqlite --in-memory

# MySQL (stub no MVP — exit 70)
node main.ts listar-contratos --driver mysql --db "mysql://..."
```

### Resultado dos 4 gates

| Gate | Resultado |
| :--- | :--- |
| `pnpm format:check` | ✓ |
| `pnpm lint` | ✓ |
| `pnpm typecheck` | ✓ |
| `pnpm test` | **310/310** verdes (era 310 com 24 falhas no W0) |

### Exit codes documentados em main.ts

| Código | Quando |
| :---: | :--- |
| 0 | sucesso ou `--help` |
| 1 | erro de domínio/use case |
| 64 (EX_USAGE) | flag desconhecida/conflito, subcomando inválido |
| 70 (EX_SOFTWARE) | driver não wired (mysql) |
| 74 (EX_IOERR) | falha de I/O (state file, sqlite open/pragma/ddl) |

## W2 — Resultado da auditoria (APPROVED_WITH_NOTES)

### 6 dimensões — todas OK

| # | Dimensão | Resultado |
| :- | :--- | :--- |
| 1 | Isolamento de driver | ✅ zero `xxxHandle` ou `.repo` em comandos |
| 2 | Backward compat | ✅ default `parseDriverFlags` = `{ memory, ./cli-state.json }` |
| 3 | Propagação de erros | ✅ 11 códigos no dicionário PT-BR, exit codes mapeados (64/70/74) |
| 4 | `shutdown()` garantido | ✅ try/finally cobre rejection; `buildContext` antes do try (sem leak se init falha) |
| 5 | `await ctx.persist()` | ✅ 4/4 comandos de escrita com `await` + exit 74 em erro |
| 6 | `parseDriverFlags` sanity | ✅ casos sutis verificados (defaults, conflitos cruzados, missing-value) |

### 6 NOTES opcionais para o W3

| # | Onde | O que |
| :- | :--- | :--- |
| NOTE-1 | `parse-driver-flags.ts:54` | Heurística `startsWith('--')` rejeita valor legítimo começando com `--`. Improvável; documentar é suficiente. |
| NOTE-2 | `parse-driver-flags.ts:52-61` | Forma com espaço aceita `--db ""` (string vazia) como valor válido. Forma `--db=` já valida. Aplicar validação simétrica. |
| NOTE-3 | `formatters/error.ts:74-75` | Mensagem de `cli-driver-flag-conflict` genérica para 4 pares de conflito. Operador pode demorar a entender qual par foi violado. Sugestão: anexar "Use apenas uma das flags em cada par." |
| NOTE-4 | `main.ts:35-38` | `exitCodeForContextError(error: string)` perde exaustividade. Trocar por `CliContextError` + switch para o compilador validar. |
| NOTE-5 | `context.ts:43-46` | `throw new Error(unreachable)` no default — TS `never` garante que nunca alcança. Aceitável, registrar. |
| NOTE-6 | `drivers/{memory,sqlite,mysql}.ts` | `await Promise.resolve()` no topo de cada `build*Context` para satisfazer `require-await`. Alternativa cleaner: usar `Promise.resolve(...)` direto. Subjetivo. |

### 7 STRENGTHS preservadas

1. `CliContext` exposto só por ports — boundary realmente contido.
2. `try/finally` minimalista com `buildContext` posicionado **antes** do try.
3. `shutdown()` no SQLite fecha conexão mesmo em erro do comando.
4. `sqlite-driver.ts` fecha `raw.close()` em falha de pragma/DDL — sem leak.
5. `CliContextError` é union explícito e exaustivo.
6. Padrão consistente nos 4 comandos de escrita: validar → use-case → persist → escrever.
7. `parse-driver-flags.ts` separa **extração sintática** (`extractFlags`) de **validação semântica** (`buildXxxDriver`).

## W3 — entregue

### NOTES endereçadas

| # | Onde | Solução |
| :- | :--- | :--- |
| **NOTE-2** | `parse-driver-flags.ts:55` | adicionada validação `next === ''` na forma com espaço — simétrica ao caminho `--db=` |
| **NOTE-3** | `formatters/error.ts:75` | mensagem expandida com "Use apenas uma flag de cada par (--state OU --no-state; --db OU --in-memory)" |
| **NOTE-4** | `main.ts:35-52` | `exitCodeForContextError` agora recebe `CliContextError` (union exaustivo) com switch + `_exhaustive: never`. Compilador valida que todos os ramos de erro têm exit code mapeado. |

NOTES 1, 5 e 6 ficaram não-endereçadas por opção:

- **NOTE-1** (heurística `startsWith('--')` rejeita valor legítimo começando com `--`): aceito como documentado, ninguém envia paths SQLite começando com `--`.
- **NOTE-5** (`throw unreachable` no default): TS `never` garante; padrão consistente com o resto do projeto.
- **NOTE-6** (`await Promise.resolve()` em factories): subjetivo; manter para consistência com outros pontos do code-base.

### Smoke tests reais (CLI rodando direto)

```
$ pnpm cli:contracts --help
→ lista os 6 subcomandos + 5 flags globais (driver, state, no-state, db, in-memory, help)
   exit 0 ✓

$ pnpm cli:contracts criar-contrato --driver sqlite --in-memory \
    --numero 999/2026 --titulo "Smoke W3" --objetivo "..." \
    --assinado-em 2026-01-15 --valor-centavos 1000000 --inicio 2026-02-01 --fim 2026-12-31
→ ✅ Contrato criado.
   Contrato 999/2026  ID: a09634e5-c301-46b5-97b5-7ac7d0f0c6c2  ...
   exit 0 ✓
```

End-to-end real validado contra Drizzle/SQLite efêmero — 0 arquivo `.db` criado no cwd (modo `:memory:` honrado).

### Handbook

[`handbook/architecture/06-persistence-strategy.md`](../../../../handbook/architecture/06-persistence-strategy.md) ganhou §4.1 "CLI e escolha de driver":

- Tabela de uso por driver (6 cenários canônicos).
- Regras de validação de flags + pares mutuamente exclusivos.
- Tabela de exit codes (sysexits.h).
- Diretriz "quando escolher cada driver" (memory, sqlite arquivo, sqlite `:memory:`, mysql).
- Shutdown garantido via `try/finally`.

### Resultado dos 4 gates

| Gate | Resultado |
| :--- | :--- |
| `pnpm format:check` | ✓ |
| `pnpm lint` | ✓ |
| `pnpm typecheck` | ✓ |
| `pnpm test` | **310/310** verdes |

## 🎉 Ticket FECHADO

Sucessores recomendados:

- **`CTR-ADAPTER-DRIZZLE-MYSQL-WIRE`** — substituir stub em `drivers/mysql.ts:8-13` por wire real quando infra MySQL estiver pronta. Ponto de extensão isolado: zero impacto em outros drivers.
- **`CTR-EVENTS-OUTBOX`** — adapter de outbox persistente para o event bus (hoje InMemory mesmo no driver sqlite).
- **`CTR-MIGRATION-FROM-LEGACY-MYSQL`** — importar dump legado para o schema novo via Drizzle.

## Pré-requisitos

- ✅ `CTR-ADAPTER-DRIZZLE-DUAL` fechado — adapter Drizzle/SQLite funcional.
- ✅ ADR-0018 Accepted — princípio 1-port-N-drivers documentado.

## Notas

- Refatoração `CliContext` (handles → ports) é a parte mais delicada. Os comandos existentes (`criar-contrato.ts` etc.) precisam de mudança mecânica `ctx.xxxHandle.repo` → `ctx.xxx`. Testes E2E existentes pegam qualquer quebra.
- MySQL fica **stubado** — aceita parsing, falha no init com mensagem clara apontando para `CTR-ADAPTER-DRIZZLE-MYSQL-WIRE`.
- Backward compat absoluta: sem flag = `--driver memory --state ./cli-state.json` (default atual). Toda script existente continua funcionando.

## Decisões confirmadas

- **Flag para SQLite efêmero**: `--in-memory` (mapeia direto ao `:memory:` do SQLite). Confirmado pelo usuário em 2026-05-14.
