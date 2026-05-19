# Ticket CTR-CLI-DRIVER-FLAG: flag `--driver memory|sqlite|mysql` na CLI

> Documentação PT, identificadores EN (regra invariante).

## Contexto

O `CTR-ADAPTER-DRIZZLE-DUAL` entregou (W0-W3, 283/283 testes verdes) um adapter de persistência via Drizzle com schema SQLite funcional e schema MySQL stubado, conforme [ADR-0018](../../../../handbook/architecture/adr/0018-persistence-dual-dialect-drizzle.md). Hoje, porém, o adapter Drizzle **só é exercitado por testes** — a CLI continua usando InMemory + state file JSON.

A próxima ponte natural: permitir que o operador (P.O., dev, QA) execute comandos da CLI contra **qualquer um dos drivers** disponíveis, mantendo o fluxo manual de validação que o time já conhece.

## Motivação

1. **Exercitar o adapter Drizzle/SQLite em uso real** — testes unitários cobrem 20 cenários por driver, mas a P.O. valida BDD manualmente. Sem flag, a sessão de QA nunca toca SQLite.
2. **Encontrar bugs de integração antes do MySQL** — qualquer diferença sutil entre InMemory e Drizzle (ex.: comportamento de FK em delete, ordenação de `list()`, encoding de UUID) aparece primeiro aqui, em ambiente reproduzível.
3. **Preparar o terreno para `CTR-ADAPTER-DRIZZLE-MYSQL-WIRE`** — quando a infra MySQL subir, basta wirear o driver; a CLI já sabe rotear via `--driver mysql`.
4. **Backward compat preservada** — sem flag = comportamento atual (InMemory + state file).

## Escopo

### Refatoração obrigatória — `CliContext`

Hoje `CliContext` vaza handles InMemory:

```ts
// src/modules/contracts/cli/context.ts (estado atual)
export type CliContext = Readonly<{
  contractRepoHandle: InMemoryContractRepositoryHandle;  // ← vazamento
  amendmentRepoHandle: InMemoryAmendmentRepositoryHandle; // ← vazamento
  eventBusHandle: InMemoryEventBusHandle;                 // ← vazamento
  ...
}>;
```

Os comandos consomem via `ctx.contractRepoHandle.repo`. Isso impede troca de driver sem rewrite dos comandos.

**Refatoração**: `CliContext` passa a expor apenas **ports**:

```ts
// estado alvo
export type CliContext = Readonly<{
  contractRepo: ContractRepository;
  amendmentRepo: AmendmentRepository;
  eventBus: EventBus;
  clock: Clock;
  persist: () => Promise<Result<void, PersistError>>;   // no-op se driver persiste a cada save
  shutdown: () => Promise<void>;                         // fecha conexões (sqlite/mysql)
}>;
```

Cada driver tem seu **factory** que retorna `CliContext`. Os comandos não mudam — só consomem `ctx.contractRepo`.

### Comportamento por driver

| Driver | Flags adicionais | Persistência | Notas |
| :--- | :--- | :--- | :--- |
| **`memory`** (default) | `--state <path>` (default `./cli-state.json`) ou `--no-state` | state file JSON via `saveState()` no fim de cada comando | comportamento atual, 100% backward compat |
| **`sqlite`** | `--db <path>` (default `./contracts.db`) ou `--in-memory` (`:memory:`) | DB persiste a cada operação; `persist()` é no-op | usa `openSqlite()` do W1 |
| **`mysql`** | `--db <connection-string>` ou env `MYSQL_URL` | DB persiste a cada operação | **stub**: imediatamente retorna erro `cli-mysql-driver-not-wired`, exit 70 (EX_SOFTWARE); aceita as flags só para validar parsing |

### Sintaxe alvo

```bash
# Default (backward compat — InMemory + cli-state.json)
node main.ts criar-contrato --numero 001/2026 --titulo "..." ...

# Explícito
node main.ts criar-contrato --driver memory --state ./qa.json --numero ...

# Modo efêmero (memory sem state)
node main.ts listar-contratos --driver memory --no-state

# SQLite com arquivo
node main.ts criar-contrato --driver sqlite --db ./teste.db --numero ...

# SQLite efêmero (memory: do SQLite, descarta no fim do comando)
node main.ts listar-contratos --driver sqlite --in-memory

# MySQL (stub no MVP)
node main.ts listar-contratos --driver mysql --db "mysql://..."
# → ❌ Driver MySQL ainda não disponível. Aguardando ticket CTR-ADAPTER-DRIZZLE-MYSQL-WIRE.
# → exit 70
```

### Estrutura do código

```
src/modules/contracts/cli/
├── context.ts                    # CliContext agora expõe ports (refatoração)
├── drivers/
│   ├── memory-driver.ts          # buildContextMemory(statePath: string | null)
│   ├── sqlite-driver.ts          # buildContextSqlite({ path | ':memory:' })
│   └── mysql-driver.ts           # stub: retorna err('cli-mysql-driver-not-wired')
├── parse-driver-flags.ts         # parse de --driver, --db, --in-memory, --state, --no-state
└── (commands/, formatters/ etc continuam intactos — só mudam de `ctx.xxxHandle.repo` para `ctx.xxx`)
```

### Erros novos

Códigos adicionados ao dicionário PT-BR (`formatters/error.ts`):

| Código | Mensagem | Exit code |
| :--- | :--- | :---: |
| `cli-driver-unknown` | Driver desconhecido. Use: memory, sqlite ou mysql. | 64 |
| `cli-driver-flag-conflict` | Flags incompatíveis: `--state` só vale com `--driver memory`. | 64 |
| `cli-mysql-driver-not-wired` | Driver MySQL ainda não disponível. Aguardando ticket CTR-ADAPTER-DRIZZLE-MYSQL-WIRE. | 70 |
| `sqlite-driver-open-failed` | Não foi possível abrir o arquivo SQLite. | 74 |
| `sqlite-driver-pragma-failed` | Falha ao configurar PRAGMAs no SQLite. | 74 |
| `sqlite-driver-ddl-failed` | Falha ao aplicar schema no SQLite. | 74 |

### Validação de flags

| Combinação | Comportamento |
| :--- | :--- |
| `--state X` + `--driver sqlite` | ❌ `cli-driver-flag-conflict` (state file não faz sentido com DB real) |
| `--db X` + `--driver memory` | ❌ `cli-driver-flag-conflict` (memory não tem arquivo de DB) |
| `--in-memory` + `--driver memory` | ❌ `cli-driver-flag-conflict` (use `--no-state` para efêmero em memory) |
| `--state X` + `--no-state` | ❌ `cli-driver-flag-conflict` |
| `--driver mysql` (qualquer combinação válida de flags) | aceita parsing, retorna stub |

## Decisões de design

| # | Decisão | Justificativa |
| :- | :--- | :--- |
| D1 | Default = `memory` | Backward compat absoluta — toda script/teste existente continua funcionando. |
| D2 | `--in-memory` (não `--db :memory:`) | Mais legível e protege contra digitar caminho de arquivo errado. |
| D3 | `--state` mantido como alias de `--driver memory --state` | Não quebrar muscle memory da P.O. e dos scripts atuais. |
| D4 | MySQL stub aceita parsing das flags mas falha no init | Garante que o roteamento de comando funciona; quando o ticket MySQL fechar, basta plugar o driver. |
| D5 | `persist()` continua no `CliContext` | Memory ainda precisa dele. Outros drivers: no-op trivial (retorna `ok(undefined)`). |
| D6 | `shutdown()` novo no `CliContext` | SQLite precisa fechar a conexão para liberar arquivo. Memory: no-op. Garante uso em `finally` no `main.ts`. |
| D7 | Refatoração elimina `xxxHandle.repo` dos comandos | Limpa a abstração de uma vez, sem precisar repetir no `CTR-ADAPTER-DRIZZLE-MYSQL-WIRE`. |

## Critérios de aceite

### Funcionalidade
- [ ] `--driver memory` (ou ausente) preserva 100% do comportamento atual.
- [ ] `--driver sqlite --db <path>` cria/lê de arquivo SQLite. Re-execução do mesmo comando vê estado anterior.
- [ ] `--driver sqlite --in-memory` cria DB efêmero (estado descartado ao fim do processo).
- [ ] `--driver mysql ...` retorna `cli-mysql-driver-not-wired` com exit 70.
- [ ] Flag inválida ou combinação inválida → exit 64 com mensagem clara.
- [ ] `--help` lista os drivers e suas flags.

### Refatoração
- [ ] `CliContext` expõe **ports**, não handles. Zero referência a `InMemoryContractRepositoryHandle` fora de `drivers/memory-driver.ts`.
- [ ] Comandos (`criar-contrato.ts`, etc.) usam `ctx.contractRepo`, não `ctx.contractRepoHandle.repo`.
- [ ] `state.ts` continua existindo e funcionando para `memory` driver.

### Cobertura de testes
- [ ] Testes E2E existentes (`tests/cli/contracts.cli.test.ts`) **continuam passando** sem modificação — backward compat.
- [ ] **Nova suite E2E** `contracts.cli.sqlite.test.ts` que roda os mesmos cenários BDD (criar → aditivo → anexar → homologar) com `--driver sqlite --db <tempfile>`. Deve produzir saída idêntica.
- [ ] Testes de parsing (`parse-driver-flags.test.ts`) cobrindo todas as combinações inválidas.

### Qualidade
- [ ] 4 gates verdes: format, lint, typecheck, test.
- [ ] Todos os 283 testes atuais continuam verdes.
- [ ] Total ≥ 295 testes (+12 entre parsing + E2E SQLite).

### Documentação
- [ ] `help` do `--help` global e dos comandos atualizado.
- [ ] Seção nova em `handbook/architecture/06-persistence-strategy.md` documentando a flag.

## Plano de waves

| Wave | Entregas |
| :--- | :--- |
| **W0 RED** | Testes E2E `--driver sqlite` rodando os 4 cenários BDD + testes de parsing — todos VERMELHOS. |
| **W1 GREEN** | Refatoração `CliContext` (ports), drivers (memory/sqlite/mysql), `parse-driver-flags.ts`, formatters de erro. Suite passa. |
| **W2 REVIEW** | Verificar (a) zero `xxxHandle.repo` fora do driver memory, (b) erros propagados corretamente, (c) sem flag-creep nos comandos, (d) backward compat preservada. |
| **W3 QUALITY** | 4 gates + handbook + atualização de `--help`. |

## Fora de escopo

- **Driver MySQL real** — vai pra `CTR-ADAPTER-DRIZZLE-MYSQL-WIRE` (stub aqui valida apenas que o roteamento funciona).
- **Migrations automáticas no startup** — quando passa `--db arquivo.db` e o arquivo não existe, `openSqlite` aplica `SQLITE_DDL` inline (já funciona). Migrations versionadas via `drizzle-kit` ficam para uso humano.
- **Connection pool / config avançada de SQLite** — não-funcional, ticket à parte.
- **Validação que o arquivo SQLite é compatível com o schema atual** — confia que `CREATE TABLE IF NOT EXISTS` é idempotente; se schema mudar, o user precisa rodar migrations manualmente.
- **Flag `--driver` em testes existentes da CLI** — testes E2E atuais usam o default `memory`, nenhuma mudança necessária.

## Riscos e mitigações

| Risco | Mitigação |
| :--- | :--- |
| Refatoração `CliContext` quebra comandos | Refatoração é mecânica (`xxxHandle.repo` → `xxx`). Testes E2E existentes capturam regressão. |
| `shutdown()` esquecido em algum path do main.ts | Usar `try/finally` no `main()`. Testes E2E que rodam SQLite com `--db <tempfile>` validam liberação. |
| Comportamento sutil entre InMemory e Drizzle aparece só aqui | É **exatamente o motivo** deste ticket existir — suite E2E paralela em `memory` e `sqlite` força paridade real. |
| MySQL stub trava algum caminho de inicialização | Stub falha **antes** de criar repos — exit 70 imediato sem tentar conectar. |

## Estimativa

- Refatoração `CliContext` + drivers: ~150 linhas de TS.
- `parse-driver-flags.ts` + erros + formatters: ~80 linhas.
- E2E suite `--driver sqlite`: ~120 linhas (reaproveita helpers do `tests/cli/`).
- Total: ~350 linhas + docs.

## Tickets relacionados

- `CTR-ADAPTER-DRIZZLE-DUAL` (✅ fechado) — entregou o adapter Drizzle/SQLite.
- `CTR-ADAPTER-DRIZZLE-MYSQL-WIRE` — wire MySQL real (libera o stub deste ticket).
- `CTR-MIGRATION-FROM-LEGACY-MYSQL` — importar dump legado para schema novo.
